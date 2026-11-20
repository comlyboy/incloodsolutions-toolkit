/**
 * `@incloodsolutions/node-toolkit` — AWS SDK wrappers (`src/aws/sdk`).
 *
 * AWS clients are stubbed with `aws-sdk-client-mock` (patches `Client#send`);
 * `@aws-sdk/s3-request-presigner`'s `getSignedUrl` is stubbed with Vitest.
 * No AWS credentials or network are used.
 */

import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import {
	GetParameterCommand,
	GetParametersByPathCommand,
	GetParametersCommand,
	SSMClient,
} from '@aws-sdk/client-ssm';
import {
	DeleteCommand,
	DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
	UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { number, object, string } from 'zod';

import { CustomException } from '@incloodsolutions/toolkit/error';

import {
	initDynamoDbClientWrapper,
	initEventBridgeClientWrapper,
	initS3ClientWrapper,
	initSesClientWrapper,
	initSnsClientWrapper,
	initSsmParameterClientWrapper,
	uploadToS3ViaCli,
} from '../src/index';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
	getSignedUrl: vi.fn(async () => 'https://signed.example/object?sig=abc'),
}));

const s3Mock = mockClient(S3Client);

const sesMock = mockClient(SESClient);

const snsMock = mockClient(SNSClient);

const ssmMock = mockClient(SSMClient);

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
	s3Mock.reset();
	sesMock.reset();
	snsMock.reset();
	ssmMock.reset();
	ddbMock.reset();
	vi.mocked(getSignedUrl).mockClear();
});

/* ========================================================================== */

describe('initS3ClientWrapper', () => {
	const s3 = () => initS3ClientWrapper({ bucketName: 'my-bucket' });

	it('exposes the four operations', () => {
		expect(Object.keys(s3())).toEqual([
			'uploadFile',
			'getFile',
			'generateSignedUrl',
			'deleteFile',
		]);
	});

	it('uploadFile issues a PutObjectCommand keyed to the bucket', async () => {
		s3Mock.on(PutObjectCommand).resolves({ ETag: '"x"' });
		await s3().uploadFile({ fileName: 'reports/q1.csv' });
		expect(s3Mock.commandCalls(PutObjectCommand)[0].args[0].input).toEqual({
			Key: 'reports/q1.csv',
			Bucket: 'my-bucket',
		});
	});

	it('getFile issues a GetObjectCommand', async () => {
		s3Mock.on(GetObjectCommand).resolves({ ContentLength: 3 });
		await s3().getFile({ fileName: 'a.txt' });
		expect(s3Mock.commandCalls(GetObjectCommand)).toHaveLength(1);
	});

	it('deleteFile returns the DeleteMarker flag', async () => {
		s3Mock.on(DeleteObjectCommand).resolves({ DeleteMarker: true });
		await expect(s3().deleteFile({ fileName: 'a.txt' })).resolves.toBe(true);
	});

	it('generateSignedUrl delegates to getSignedUrl and returns the url', async () => {
		const url = await s3().generateSignedUrl({
			fileName: 'a.txt',
			commandType: 'read',
			expiresIn: 900,
		});
		expect(url).toBe('https://signed.example/object?sig=abc');
		expect(getSignedUrl).toHaveBeenCalledWith(
			expect.anything(),
			expect.any(GetObjectCommand),
			{ expiresIn: 900 },
		);
	});
});

describe('initSesClientWrapper', () => {
	const ses = () =>
		initSesClientWrapper({ sourceEmail: 'no-reply@inclood.io' });

	it('sends an HTML email by default', async () => {
		sesMock.on(SendEmailCommand).resolves({ MessageId: 'm-1' });
		await ses().sendEmail({
			subject: 'Welcome',
			message: { content: '<b>hi</b>' },
			receivers: ['a@x.io', 'b@x.io'],
		});
		const input = sesMock.commandCalls(SendEmailCommand)[0].args[0].input;
		expect(input.Source).toBe('no-reply@inclood.io');
		expect(input.Destination?.ToAddresses).toEqual(['a@x.io', 'b@x.io']);
		expect(input.Message?.Subject?.Data).toBe('Welcome');
		expect(input.Message?.Body?.Html?.Data).toBe('<b>hi</b>');
		expect(input.Message?.Body?.Text).toBeUndefined();
	});

	it('sends a text email when message.type is "text"', async () => {
		sesMock.on(SendEmailCommand).resolves({});
		await ses().sendEmail({
			subject: 'S',
			message: { content: 'plain', type: 'text' },
			receivers: ['a@x.io'],
		});
		const input = sesMock.commandCalls(SendEmailCommand)[0].args[0].input;
		expect(input.Message?.Body?.Text?.Data).toBe('plain');
		expect(input.Message?.Body?.Html).toBeUndefined();
	});
});

describe('initSnsClientWrapper', () => {
	const sns = () => initSnsClientWrapper({ config: { region: 'us-east-1' } });

	it('sendSnsMessage publishes the JSON-stringified message', async () => {
		snsMock.on(PublishCommand).resolves({ MessageId: 'x' });
		await sns().sendSnsMessage({
			message: { event: 'order.created', id: 1 },
			options: { TopicArn: 'arn:aws:sns:...:orders' },
		});
		const input = snsMock.commandCalls(PublishCommand)[0].args[0].input;
		expect(input.Message).toBe('{"event":"order.created","id":1}');
		expect(input.TopicArn).toBe('arn:aws:sns:...:orders');
	});

	it('sendSms publishes with a PhoneNumber', async () => {
		snsMock.on(PublishCommand).resolves({});
		await sns().sendSms({ message: 'Code 1234', phoneNumber: '+15550000000' });
		const input = snsMock.commandCalls(PublishCommand)[0].args[0].input;
		expect(input).toEqual({
			Message: 'Code 1234',
			PhoneNumber: '+15550000000',
		});
	});
});

describe('initSsmParameterClientWrapper', () => {
	const ssm = () => initSsmParameterClientWrapper();

	it('getParameter returns the decrypted value', async () => {
		ssmMock
			.on(GetParameterCommand)
			.resolves({ Parameter: { Name: '/app/db-password', Value: 's3cret' } });
		const value = await ssm().getParameter({ name: '/app/db-password' });
		expect(value).toBe('s3cret');
		const input = ssmMock.commandCalls(GetParameterCommand)[0].args[0].input;
		expect(input).toEqual({
			Name: '/app/db-password',
			WithDecryption: true,
		});
	});

	it('getParameter returns undefined when the parameter has no value', async () => {
		ssmMock.on(GetParameterCommand).resolves({});
		expect(await ssm().getParameter({ name: '/app/missing' })).toBeUndefined();
	});

	it('getParameters maps found names to values and reports invalid names', async () => {
		ssmMock.on(GetParametersCommand).resolves({
			Parameters: [
				{ Name: '/app/a', Value: '1' },
				{ Name: '/app/b', Value: '2' },
			],
			InvalidParameters: ['/app/missing'],
		});
		const { values, invalidParameterNames } = await ssm().getParameters({
			names: ['/app/a', '/app/b', '/app/missing'],
		});
		expect(values).toEqual({ '/app/a': '1', '/app/b': '2' });
		expect(invalidParameterNames).toEqual(['/app/missing']);
	});

	it('getParametersByPath follows pagination until NextToken is exhausted', async () => {
		ssmMock
			.on(GetParametersByPathCommand)
			.resolvesOnce({
				Parameters: [{ Name: '/app/a', Value: '1' }],
				NextToken: 'page-2',
			})
			.resolvesOnce({
				Parameters: [{ Name: '/app/b', Value: '2' }],
			});
		const values = await ssm().getParametersByPath({ path: '/app/' });
		expect(values).toEqual({ '/app/a': '1', '/app/b': '2' });
		expect(ssmMock.commandCalls(GetParametersByPathCommand)).toHaveLength(2);
		expect(
			ssmMock.commandCalls(GetParametersByPathCommand)[1].args[0].input
				.NextToken,
		).toBe('page-2');
	});
});

describe('initEventBridgeClientWrapper / uploadToS3ViaCli (placeholders)', () => {
	it('initEventBridgeClientWrapper returns an empty object', () => {
		expect(initEventBridgeClientWrapper()).toEqual({});
	});

	it('uploadToS3ViaCli is a no-op returning undefined', () => {
		expect(uploadToS3ViaCli({})).toBeUndefined();
	});
});

describe('initDynamoDbClientWrapper', () => {
	const itemSchema = object({ name: string() }) as never;

	const table = () =>
		initDynamoDbClientWrapper<{
			id: string;
			name: string;
			createdAtDate: string;
		}>({
			tableName: 'items',
			schema: itemSchema,
			compositePrimaryKeyOptions: {
				primaryKeyName: 'id',
				primaryKeyIdType: 'uuid',
			},
		});

	it('exposes the CRUD methods', () => {
		expect(Object.keys(table())).toEqual([
			'put',
			'query',
			'getOne',
			'getMany',
			'updateOne',
			'incrementOne',
			'delete',
		]);
	});

	it("escapes any of DynamoDB's ~573 reserved words, case-insensitively — not just the old 5-word list", async () => {
		// `value` and `order` are real DynamoDB reserved words that were NOT in
		// the old hand-picked 5-word list (`status`, `name`, `names`, `type`,
		// `types`) — this would have produced a real `ValidationException`
		// before the list was expanded to the full official set.
		const wideTable = initDynamoDbClientWrapper<{
			id: string;
			Value: string;
			order: string;
		}>({
			tableName: 'items',
			schema: object({ Value: string(), order: string() }) as never,
			compositePrimaryKeyOptions: { primaryKeyName: 'id' },
		});
		ddbMock.on(UpdateCommand).resolves({ Attributes: { id: '1' } });
		await wideTable.updateOne({
			key: { id: '1' },
			data: { Value: 'x', order: 'y' },
		});
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input;
		// Matching is case-insensitive: `Value` (capitalised) still matches the
		// lower-cased `value` entry in the reserved-word list.
		expect(input.ExpressionAttributeNames).toMatchObject({
			'#Value_': 'Value',
			'#order_': 'order',
		});
		expect(input.ExpressionAttributeValues).toMatchObject({
			':Value': 'x',
			':order': 'y',
		});
	});

	it('put auto-generates the primary key + createdAtDate and writes the item', async () => {
		ddbMock.on(PutCommand).resolves({});
		const result = await table().put({ data: { name: 'Widget' } });
		expect(result.name).toBe('Widget');
		expect(typeof result.id).toBe('string');
		expect(result.createdAtDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		const input = ddbMock.commandCalls(PutCommand)[0].args[0].input;
		expect(input.TableName).toBe('items');
		// The schema only declares `name`; the generated key and date must still be written.
		expect(input.Item).toMatchObject({
			name: 'Widget',
			id: result.id,
			createdAtDate: result.createdAtDate,
		});
	});

	it('put drops fields the schema does not declare', async () => {
		ddbMock.on(PutCommand).resolves({});
		await table().put({ data: { name: 'Widget', extra: 'x' } as never });
		const input = ddbMock.commandCalls(PutCommand)[0].args[0].input;
		expect(input.Item).not.toHaveProperty('extra');
	});

	it('put validates against the Zod schema and never calls PutCommand on failure', async () => {
		ddbMock.on(PutCommand).resolves({});
		await expect(
			table().put({ data: { name: 1 as never } }),
		).rejects.toBeInstanceOf(CustomException);
		expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0);
	});

	it('getOne issues a GetCommand and returns the Item', async () => {
		ddbMock.on(GetCommand).resolves({ Item: { id: '1', name: 'W' } });
		await expect(table().getOne({ key: { id: '1' } })).resolves.toEqual({
			id: '1',
			name: 'W',
		});
	});

	it('delete issues a DeleteCommand and resolves true', async () => {
		ddbMock.on(DeleteCommand).resolves({});
		await expect(table().delete({ key: { id: '1' } })).resolves.toBe(true);
	});

	it('updateOne does not stamp modifiedAtDate while mapSchemaModifiedDate is disabled', async () => {
		// `mapSchemaModifiedDate` is commented out in dynamo-db.ts. When it is
		// re-enabled, flip this test to expect `modifiedAtDate` in the
		// UpdateExpression and an ISO date in ExpressionAttributeValues.
		ddbMock.on(UpdateCommand).resolves({ Attributes: { id: '1' } });
		await table().updateOne({ key: { id: '1' }, data: { name: 'Widget 2' } });
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input;
		expect(input.UpdateExpression).not.toContain('modifiedAtDate');
	});

	it('updateOne uses a reserved-word-free value placeholder for a reserved attribute name', async () => {
		// `name` is in AWS_DYNAMODB_RESERVED_WORDS, so it needs an
		// ExpressionAttributeNames placeholder (`#name_`) — but the VALUE
		// placeholder (`:name`) must never carry the `#` prefix, since
		// DynamoDB rejects `#` inside a value placeholder token.
		ddbMock.on(UpdateCommand).resolves({ Attributes: { id: '1' } });
		await table().updateOne({ key: { id: '1' }, data: { name: 'Widget 2' } });
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input;
		expect(input.ExpressionAttributeNames).toMatchObject({ '#name_': 'name' });
		expect(input.UpdateExpression).toContain('#name_ = :name');
		expect(input.ExpressionAttributeValues).toMatchObject({
			':name': 'Widget 2',
		});
		expect(input.ExpressionAttributeValues).not.toHaveProperty(':#name_');
	});
});

describe('initDynamoDbClientWrapper incrementOne', () => {
	type Counters = {
		id: string;
		entityName: string;
		nextInvoiceNumber: number;
		createdAtDate: string;
	};

	const counters = () =>
		initDynamoDbClientWrapper<Counters>({
			tableName: 'items',
			schema: object({
				entityName: string(),
				nextInvoiceNumber: number(),
				createdAtDate: string(),
			}) as never,
			compositePrimaryKeyOptions: { primaryKeyName: 'id' },
		});

	const lastUpdate = () =>
		ddbMock.commandCalls(UpdateCommand).at(-1)!.args[0].input;

	it('adds inside DynamoDB with if_not_exists, and resolves with the new value by default', async () => {
		ddbMock
			.on(UpdateCommand)
			.resolves({ Attributes: { nextInvoiceNumber: 1 } });

		await expect(
			counters().incrementOne({
				key: { id: 'counters:1' },
				field: 'nextInvoiceNumber',
			}),
		).resolves.toBe(1);

		const input = lastUpdate();
		expect(input.Key).toEqual({ id: 'counters:1' });
		expect(input.UpdateExpression).toBe(
			'SET #counter0 = if_not_exists(#counter0, :startsAt) + :by',
		);
		expect(input.ExpressionAttributeNames).toEqual({
			'#counter0': 'nextInvoiceNumber',
		});
		expect(input.ExpressionAttributeValues).toEqual({
			':startsAt': 0,
			':by': 1,
		});
		expect(input.ReturnValues).toBe('UPDATED_NEW');
	});

	it("resolves with the value from before the addition when asked for 'previous'", async () => {
		ddbMock
			.on(UpdateCommand)
			.resolves({ Attributes: { nextInvoiceNumber: 7 } });

		await expect(
			counters().incrementOne({
				key: { id: 'counters:1' },
				field: 'nextInvoiceNumber',
				startsAt: 1,
				returns: 'previous',
			}),
		).resolves.toBe(7);
		expect(lastUpdate().ReturnValues).toBe('ALL_OLD');
		expect(lastUpdate().ExpressionAttributeValues).toMatchObject({
			':startsAt': 1,
		});
	});

	it("falls back to startsAt for 'previous' when the item did not exist", async () => {
		// ALL_OLD returns no attributes at all for an item that was not there.
		ddbMock.on(UpdateCommand).resolves({});

		await expect(
			counters().incrementOne({
				key: { id: 'counters:new' },
				field: 'nextInvoiceNumber',
				startsAt: 1,
				returns: 'previous',
			}),
		).resolves.toBe(1);
	});

	it('writes ifMissing attributes with if_not_exists, so existing ones are kept', async () => {
		ddbMock
			.on(UpdateCommand)
			.resolves({ Attributes: { nextInvoiceNumber: 2 } });

		await counters().incrementOne({
			key: { id: 'counters:1' },
			field: 'nextInvoiceNumber',
			ifMissing: { entityName: 'business-counters', createdAtDate: 'now' },
		});

		const input = lastUpdate();
		expect(input.UpdateExpression).toBe(
			'SET #counter0 = if_not_exists(#counter0, :startsAt) + :by, #missing0 = if_not_exists(#missing0, :missing0), #missing1 = if_not_exists(#missing1, :missing1)',
		);
		expect(input.ExpressionAttributeNames).toEqual({
			'#counter0': 'nextInvoiceNumber',
			'#missing0': 'entityName',
			'#missing1': 'createdAtDate',
		});
		expect(input.ExpressionAttributeValues).toMatchObject({
			':missing0': 'business-counters',
			':missing1': 'now',
		});
	});

	it('refuses a non-finite amount, ifMissing that names the counter, and invalid ifMissing, without calling DynamoDB', async () => {
		ddbMock.on(UpdateCommand).resolves({});
		const call = (extra: object) =>
			counters().incrementOne({
				key: { id: 'counters:1' },
				field: 'nextInvoiceNumber',
				...extra,
			});

		await expect(call({ by: Number.NaN })).rejects.toBeInstanceOf(
			CustomException,
		);
		await expect(call({ startsAt: Infinity })).rejects.toBeInstanceOf(
			CustomException,
		);
		await expect(
			call({ ifMissing: { nextInvoiceNumber: 5 } }),
		).rejects.toBeInstanceOf(CustomException);
		await expect(
			call({ ifMissing: { entityName: 123 } }),
		).rejects.toBeInstanceOf(CustomException);
		expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
	});
	it('increments a number inside a map, reading the nested value back', async () => {
		const anyTable = initDynamoDbClientWrapper<any>({
			tableName: 'items',
			schema: object({ counters: object({}) }) as never,
			compositePrimaryKeyOptions: { primaryKeyName: 'id' },
		});
		ddbMock
			.on(UpdateCommand)
			.resolves({ Attributes: { counters: { invoice: 4 } } });

		await expect(
			anyTable.incrementOne({ key: { id: 'b1' }, field: 'counters.invoice' }),
		).resolves.toBe(4);

		const input = lastUpdate();
		expect(input.UpdateExpression).toBe(
			'SET #counter0.#counter1 = if_not_exists(#counter0.#counter1, :startsAt) + :by',
		);
		expect(input.ExpressionAttributeNames).toEqual({
			'#counter0': 'counters',
			'#counter1': 'invoice',
		});
	});

	it('counts down by a negative amount', async () => {
		ddbMock
			.on(UpdateCommand)
			.resolves({ Attributes: { nextInvoiceNumber: 8 } });

		await counters().incrementOne({
			key: { id: 'counters:1' },
			field: 'nextInvoiceNumber',
			by: -2,
		});
		expect(lastUpdate().ExpressionAttributeValues).toMatchObject({ ':by': -2 });
	});

	it('guards the range with a condition on the value before the addition, letting a new counter start when its first value fits', async () => {
		ddbMock
			.on(UpdateCommand)
			.resolves({ Attributes: { nextInvoiceNumber: 9 } });

		await counters().incrementOne({
			key: { id: 'counters:1' },
			field: 'nextInvoiceNumber',
			by: -1,
			startsAt: 10,
			min: 0,
			max: 100,
		});

		const input = lastUpdate();
		// before + by must stay within [0, 100], so before must be within [1, 101].
		expect(input.ConditionExpression).toBe(
			'attribute_not_exists(#counter0) OR (#counter0 >= :lowestBefore AND #counter0 <= :highestBefore)',
		);
		expect(input.ExpressionAttributeValues).toMatchObject({
			':lowestBefore': 1,
			':highestBefore': 101,
		});
	});

	it('refuses to start a new counter whose first value is already out of range', async () => {
		ddbMock
			.on(UpdateCommand)
			.resolves({ Attributes: { nextInvoiceNumber: 0 } });

		await counters().incrementOne({
			key: { id: 'counters:1' },
			field: 'nextInvoiceNumber',
			by: -5,
			startsAt: 3,
			min: 0,
		});

		expect(lastUpdate().ConditionExpression).toBe(
			'(#counter0 >= :lowestBefore)',
		);
	});

	it('turns a failed range condition into a CustomException', async () => {
		ddbMock.on(UpdateCommand).rejects(
			Object.assign(new Error('The conditional request failed'), {
				name: 'ConditionalCheckFailedException',
			}),
		);

		await expect(
			counters().incrementOne({
				key: { id: 'counters:1' },
				field: 'nextInvoiceNumber',
				by: -1,
				min: 0,
			}),
		).rejects.toBeInstanceOf(CustomException);
	});

	it('lets any other DynamoDB error through unchanged', async () => {
		const outage = new Error('throttled');
		ddbMock.on(UpdateCommand).rejects(outage);

		await expect(
			counters().incrementOne({
				key: { id: 'counters:1' },
				field: 'nextInvoiceNumber',
			}),
		).rejects.toBe(outage);
	});

	it('refuses ifMissing attributes the schema does not have, instead of dropping them', async () => {
		ddbMock.on(UpdateCommand).resolves({});

		await expect(
			counters().incrementOne({
				key: { id: 'counters:1' },
				field: 'nextInvoiceNumber',
				ifMissing: { notInSchema: 'x' } as never,
			}),
		).rejects.toBeInstanceOf(CustomException);
		expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
	});

	it('refuses min above max and an empty path segment', async () => {
		ddbMock.on(UpdateCommand).resolves({});
		const call = (extra: object) =>
			counters().incrementOne({
				key: { id: 'counters:1' },
				field: 'nextInvoiceNumber',
				...extra,
			});

		await expect(call({ min: 5, max: 1 })).rejects.toBeInstanceOf(
			CustomException,
		);
		await expect(call({ field: 'counters.' })).rejects.toBeInstanceOf(
			CustomException,
		);
		expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
	});
});

describe('initDynamoDbClientWrapper validation', () => {
	const make = (enableDebug = false) =>
		initDynamoDbClientWrapper<{ id: string; name: string; age: string }>({
			tableName: 'items',
			schema: object({ name: string(), age: string() }) as never,
			compositePrimaryKeyOptions: { primaryKeyName: 'id' },
			options: { enableDebug },
		});

	it('put throws CustomException on invalid data and never reaches DynamoDB', async () => {
		ddbMock.on(PutCommand).resolves({});
		await expect(
			make().put({ data: { name: 1, age: 'x' } as never }),
		).rejects.toBeInstanceOf(CustomException);
		expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0);
	});

	it('put rejects a missing required field, updateOne validates against schema.partial() instead', async () => {
		ddbMock.on(PutCommand).resolves({});
		ddbMock.on(UpdateCommand).resolves({ Attributes: { id: '1' } });
		await expect(make().put({ data: { name: 'ok' } })).rejects.toBeInstanceOf(
			CustomException,
		);
		await expect(
			make().updateOne({ key: { id: '1' }, data: { name: 'ok' } }),
		).resolves.toBeDefined();
	});

	it('updateOne works when the schema has refinements (zod cannot .partial() those directly)', async () => {
		ddbMock.on(UpdateCommand).resolves({ Attributes: { id: '1' } });
		const refined = initDynamoDbClientWrapper<{
			id: string;
			name: string;
			age: string;
		}>({
			tableName: 'items',
			schema: object({ name: string(), age: string() }).superRefine(
				() => undefined,
			) as never,
			compositePrimaryKeyOptions: { primaryKeyName: 'id' },
		});
		await expect(
			refined.updateOne({ key: { id: '1' }, data: { name: 'ok' } }),
		).resolves.toBeDefined();
		await expect(
			refined.updateOne({ key: { id: '1' }, data: { name: 1 } as never }),
		).rejects.toBeInstanceOf(CustomException);
	});

	it('enableDebug logs the attempt and the result via console.log, and stays silent by default', async () => {
		ddbMock.on(PutCommand).resolves({});
		const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
		try {
			await make().put({ data: { name: 'ok', age: '1' } });
			expect(spy).not.toHaveBeenCalled();

			await make(true).put({ data: { name: 'ok', age: '1' } });
			const logged = spy.mock.calls.map((call) => String(call[0]));
			expect(
				logged.some((line) => line.includes('Validating against schema')),
			).toBe(true);
			expect(logged.some((line) => line.includes('Validation succeeded'))).toBe(
				true,
			);

			spy.mockClear();
			await expect(
				make(true).put({ data: { name: 1, age: '1' } as never }),
			).rejects.toBeInstanceOf(CustomException);
			expect(
				spy.mock.calls.some((call) =>
					String(call[0]).includes('Validation failed'),
				),
			).toBe(true);
		} finally {
			spy.mockRestore();
		}
	});
});
