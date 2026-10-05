/**
 * `@incloodsolutions/node-toolkit` — AWS SDK wrappers (`src/aws/sdk`).
 *
 * AWS clients are stubbed with `aws-sdk-client-mock` (patches `Client#send`);
 * `@aws-sdk/s3-request-presigner`'s `getSignedUrl` is stubbed with Vitest.
 * No AWS credentials or network are used.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { CustomException } from '@incloodsolutions/toolkit/error';
import { object, string } from 'zod';

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

vi.mock('@aws-sdk/s3-request-presigner', () => ({
	getSignedUrl: vi.fn(async () => 'https://signed.example/object?sig=abc'),
}));
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import {
	initDynamoDbClientWrapper,
	initEventBridgeClientWrapper,
	initS3ClientWrapper,
	initSesClientWrapper,
	initSnsClientWrapper,
	initSsmParameterClientWrapper,
	uploadToS3ViaCli,
	validateSchema,
} from '../src/index';

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
			'delete',
		]);
	});

	it('put auto-generates the primary key + createdAtDate and writes the item', async () => {
		ddbMock.on(PutCommand).resolves({});
		const result = await table().put({ data: { name: 'Widget' } });
		expect(result.name).toBe('Widget');
		expect(typeof result.id).toBe('string');
		expect(result.createdAtDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		expect(ddbMock.commandCalls(PutCommand)[0].args[0].input.TableName).toBe(
			'items',
		);
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

	it('updateOne stamps modifiedAtDate and includes it in the UpdateExpression', async () => {
		ddbMock.on(UpdateCommand).resolves({ Attributes: { id: '1' } });
		await table().updateOne({ key: { id: '1' }, data: { name: 'Widget 2' } });
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input;
		expect(input.UpdateExpression).toContain('modifiedAtDate');
		expect(input.ExpressionAttributeValues[':modifiedAtDate']).toMatch(
			/^\d{4}-\d{2}-\d{2}T/,
		);
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

describe('validateSchema', () => {
	it('returns the parsed data / throws CustomException on failure', async () => {
		const schema = object({ name: string() }) as never;
		await expect(
			validateSchema({ schema, data: { name: 'ok' } }),
		).resolves.toEqual({ name: 'ok' });
		await expect(
			validateSchema({ schema, data: { name: 1 } }),
		).rejects.toBeInstanceOf(CustomException);
	});

	it('skipMissingProperties validates against schema.partial() instead', async () => {
		const schema = object({ name: string(), age: string() }) as never;
		await expect(
			validateSchema({
				schema,
				data: { name: 'ok' },
				skipMissingProperties: true,
			}),
		).resolves.toEqual({ name: 'ok' });
		await expect(
			validateSchema({ schema, data: { name: 'ok' } }),
		).rejects.toBeInstanceOf(CustomException);
	});

	it('enableDebug logs the attempt and the result via console.log, and stays silent by default', async () => {
		const schema = object({ name: string() }) as never;
		const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
		try {
			await validateSchema({ schema, data: { name: 'ok' } });
			expect(spy).not.toHaveBeenCalled();

			await validateSchema({
				schema,
				data: { name: 'ok' },
				enableDebug: true,
			});
			expect(spy).toHaveBeenCalledTimes(2);
			expect(spy.mock.calls[0][0]).toContain('Validating against schema');
			expect(spy.mock.calls[1][0]).toContain('Validation succeeded');

			spy.mockClear();
			await expect(
				validateSchema({ schema, data: { name: 1 }, enableDebug: true }),
			).rejects.toBeInstanceOf(CustomException);
			expect(spy).toHaveBeenCalledTimes(2);
			expect(spy.mock.calls[1][0]).toContain('Validation failed');
		} finally {
			spy.mockRestore();
		}
	});
});
