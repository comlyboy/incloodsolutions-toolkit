import {
	DynamoDBClient,
	DynamoDBClientConfig,
	ReturnConsumedCapacity,
} from '@aws-sdk/client-dynamodb';
import {
	BatchGetCommand,
	BatchGetCommandInput,
	BatchGetCommandOutput,
	DeleteCommand,
	DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
	QueryCommand,
	QueryCommandInput,
	QueryCommandOutput,
	TranslateConfig,
	UpdateCommand,
	UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';
// import { ZodObject,Zod } from 'zod';

import {
	ObjectType,
	IBaseEnableDebug,
	CustomException,
	generateISODate,
	generateDateInNumber,
	consoleLog,
} from '@incloodsolutions/toolkit';

import { generateCustomUUID } from '../../utility';
import { ZodObject } from 'zod/v4';
import { $ZodIssue, ParseContext } from 'zod/v4/core';

/**
 * Validates data against a Zod schema.
 *
 * @template TData
 * @param options Validation options.
 * @param options.data Data to validate.
 * @param options.schema The Zod object schema to validate against.
 * @param options.skipMissingProperties Validates against `schema.partial()` instead
 *   (every field optional) — use for partial updates where `data` is not expected
 *   to carry every field.
 *
 * @throws {CustomException}
 * Thrown with the flattened issue messages when validation fails.
 *
 * @returns The parsed, validated data.
 */
export async function validateSchema<TData>({
	schema,
	data,
	skipMissingProperties = false,
}: {
	data: TData;
	skipMissingProperties?: boolean;
	schema: ZodObject;
}): Promise<TData> {
	const resolvedSchema: ZodObject = skipMissingProperties
		? schema.partial()
		: schema;

	const {
		data: parsedData,
		success,
		error,
	} = await resolvedSchema.safeParseAsync(data);

	if (!success) {
		const errorMessages = error.issues.map((issue) => {
			const path = issue.path.join('.');
			return `${path ? `${path}: ` : ''}${issue.message}`;
		});
		throw new CustomException(errorMessages);
	}

	return parsedData as TData;
}

/**
 * Creates a lightweight CRUD wrapper around a single DynamoDB table, built on
 * the AWS SDK v3 `DynamoDBDocumentClient`.
 *
 * Takes care of the repetitive parts of talking to DynamoDB directly:
 * - Generates the partition key and stamps `createdAtDate` on {@link put}.
 * - Validates `put`/`updateOne` payloads against a Zod schema via
 *   {@link validateSchema} before any write reaches DynamoDB.
 * - Escapes attribute names that collide with DynamoDB reserved words in
 *   every generated key condition, filter, and update expression.
 * - Supports `contains`-based text search and attribute projection
 *   (`select`) in {@link query}.
 * - Transparently follows pagination in {@link query} (while `returnAll` is
 *   set) and in {@link getMany}.
 * - Optionally logs every command's input and consumed capacity via
 *   `consoleLog` when `options.options.enableDebug` is `true`.
 *
 * @template TType - Shape of one item in the table.
 * @template TTableIndexType - Union of the table's secondary index names,
 *   used to type {@link query}'s `indexName` parameter.
 * @param options - Wrapper configuration.
 * @param options.tableName - The DynamoDB table name.
 * @param options.schema - Zod object schema describing the item shape.
 *   {@link put} validates `data` against the full `schema`; `updateOne`
 *   validates against `schema.partial()` (see {@link validateSchema}).
 * @param options.compositePrimaryKeyOptions - Controls how the partition key
 *   is generated when creating a new item via `put`.
 * @param options.config - `DynamoDBClientConfig` passed straight through to
 *   the underlying `DynamoDBClient` (region, credentials, endpoint, etc.).
 * @param options.validationOptions - Reserved for future validation
 *   configuration; not currently read by any method.
 * @param options.translationConfig - `TranslateConfig` passed to
 *   `DynamoDBDocumentClient.from` (e.g. `marshallOptions`/`unmarshallOptions`,
 *   such as `removeUndefinedValues`).
 * @param options.options - Wrapper-wide runtime options (debug logging, etc.).
 *
 * @returns An object exposing `put`, `query`, `getOne`, `getMany`,
 *   `updateOne`, and `delete`, each scoped to `options.tableName`.
 */
export function initDynamoDbClientWrapper<
	TType extends ObjectType = any,
	TTableIndexType = string,
>(options: {
	/** Dynamo-db table name */
	readonly tableName: string;
	/** Zod object schema describing the item shape. */
	readonly schema: ZodObject;
	/** Options for primary and sort keys */
	readonly compositePrimaryKeyOptions?: {
		/** Dynamo-db primary key (partition key) attribute name. @default 'id' */
		readonly primaryKeyName?: string;
		/**
		 * Dynamo-db sort key attribute name, if the table has one. Informational
		 * only — no method in this wrapper currently generates or reads a sort
		 * key value from it; callers must still supply the sort key themselves
		 * wherever a `key`/`conditions` object needs one.
		 * @default undefined
		 */
		readonly sortKeyName?: string;
		/**
		 * How to generate the partition key's value on `put`:
		 * - `'uuid'` — a plain v7 UUID (`generateCustomUUID()`).
		 * - `'epochTimestamp'` — `Date.now()` as a string, e.g. `'1718000000000'`.
		 * - `'timestampUuid'` (default) — a compact numeric date prefix plus a
		 *   v7 UUID, e.g. `'20240412010255666-<uuid>'` (`generateDateInNumber()`
		 *   + `generateCustomUUID()`). Sorts lexicographically by creation time.
		 * - `'none'` — skips key generation entirely, so the caller must already
		 *   have the partition key set on `data` before calling `put`.
		 * @default timestampUuid
		 */
		readonly primaryKeyIdType?:
		'uuid' | 'timestampUuid' | 'epochTimestamp' | 'none';
	};
	/** Dynamo-db client configuration, forwarded to `new DynamoDBClient(...)`. */
	readonly config?: DynamoDBClientConfig;
	/**
	 * Validation options.
	 * @remarks Currently unused — `put` always validates against the full
	 * `schema`, and `updateOne` always validates against `schema.partial()`.
	 */
	readonly validationOptions?: ParseContext<$ZodIssue>;
	/**
	 * Dynamo-db object translation options, forwarded to
	 * `DynamoDBDocumentClient.from(client, translationConfig)`.
	 */
	readonly translationConfig?: TranslateConfig;
	readonly options?: {
		/** Reserved; not currently read by any method on the returned wrapper. */
		readonly timestamp?: boolean;
		/**
		 * Prefix included in every debug log line (alongside the command name),
		 * so logs from multiple wrapper instances can be told apart. Only has an
		 * effect when `enableDebug` is `true`.
		 */
		readonly debugContext?: string;
		// `enableDebug` (from `IBaseEnableDebug`, below): logs every command's
		// input, and on success its consumed capacity, via `consoleLog`.
		// Defaults to `false`.
	} & Readonly<Partial<IBaseEnableDebug>>;
}) {
	/**
	 * Attribute names that collide with DynamoDB's reserved-word list. Any of
	 * these used as a key/filter/update attribute name is rewritten to an
	 * expression-attribute-name placeholder (e.g. `name` → `#name`) wherever it
	 * appears in `query` and `updateOne`, since DynamoDB rejects reserved words
	 * used literally in expressions.
	 */
	const AWS_DYNAMODB_RESERVED_WORDS = [
		'status',
		'name',
		'names',
		'type',
		'types',
	];
	/** Resolved partition key attribute name — `options.compositePrimaryKeyOptions.primaryKeyName`, or `'id'`. */
	const primaryKeyName =
		options?.compositePrimaryKeyOptions?.primaryKeyName || 'id';

	const primaryKeyIdType =
		options.compositePrimaryKeyOptions?.primaryKeyIdType || 'timestampUuid';

	/** Prefix prepended to every debug log line's context (see `options.options.debugContext`). */
	const debugContext = `${options?.options?.debugContext || ''} | DynamoDb Wrapper`;
	/** The underlying document client every method sends commands through. */
	const dynamoDbClientInstance = DynamoDBDocumentClient.from(
		new DynamoDBClient(options?.config),
		options?.translationConfig,
	);

	/**
	 * Stamps `createdAtDate` onto `data`, mutating it in place. Used by `put`
	 * before the item is validated and written, so every created item carries a
	 * creation timestamp. Leaves an existing `createdAtDate` value untouched.
	 * @param data The data object to modify.
	 * @returns `data`, for convenient chaining — it is mutated, not copied.
	 */
	function mapSchemaCreatedDate(data: Partial<TType>) {
		(data as any)['createdAtDate'] = data?.createdAtDate || generateISODate();
		return data;
	}

	/**
	 * Stamps `modifiedAtDate` onto `data`, mutating it in place, the same way
	 * {@link mapSchemaCreatedDate} stamps `createdAtDate`. Intended to be called
	 * from `updateOne` before validation, so every update expression also sets
	 * a last-modified timestamp.
	 *
	 * @remarks Currently **disabled** (commented out) and not called from
	 * `updateOne` — updates do not stamp `modifiedAtDate` at the moment.
	 *
	 * @param data The data object to modify.
	 * @returns `data`, for convenient chaining — it is mutated, not copied.
	 */
	// function mapSchemaModifiedDate(data: Partial<TType>) {
	// 	(data as any)['modifiedAtDate'] = data?.modifiedAtDate || generateISODate();
	// 	return data;
	// }

	/**
	 * Generates the partition key value for a new item and sets it on `data`,
	 * mutating it in place — unless `compositePrimaryKeyOptions.primaryKeyIdType`
	 * is `'none'`, in which case `data` is returned untouched. See
	 * `compositePrimaryKeyOptions.primaryKeyIdType` for the generated formats.
	 * Used by `put`, before {@link mapSchemaCreatedDate} and validation.
	 * @param data The data object to modify.
	 * @returns `data`, for convenient chaining — it is mutated, not copied.
	 */
	function mapSchemaPrimaryKey(data: Partial<TType>) {
		if (primaryKeyIdType === 'uuid') {
			(data as any)[primaryKeyName] = generateCustomUUID();
		} else if (primaryKeyIdType === 'epochTimestamp') {
			(data as any)[primaryKeyName] = `${Date.now()}`;
		} else if (primaryKeyIdType === 'timestampUuid') {
			(data as any)[primaryKeyName] =
				`${generateDateInNumber()}-${generateCustomUUID()}`;
		} else if (primaryKeyIdType === 'none') {
			// Do nothing — the caller is expected to provide the partition key
		}
		return data;
	}

	return {
		/**
		 * Creates a new item in the DynamoDB table (`PutCommand`).
		 *
		 * Mutates and writes `data` as follows, in order:
		 * 1. {@link mapSchemaPrimaryKey} generates the partition key (unless
		 *    `primaryKeyIdType: 'none'` is set).
		 * 2. {@link mapSchemaCreatedDate} stamps `createdAtDate`.
		 * 3. The result is validated against `options.schema` via
		 *    {@link validateSchema} — throws {@link CustomException} and never
		 *    calls DynamoDB if validation fails.
		 *
		 * @param data The item to insert. Does not need the partition key or
		 *   `createdAtDate` set — both are generated/stamped here.
		 * @returns `data`, after the partition key and `createdAtDate` have been
		 *   added to it (the same object `put` mutated, not a fresh read-back).
		 */
		put: async ({ data }: { data: Partial<TType> }) => {
			mapSchemaPrimaryKey(data);
			mapSchemaCreatedDate(data);

			await validateSchema({ schema: options.schema, data });

			const { ConsumedCapacity } = await dynamoDbClientInstance.send(
				new PutCommand({
					Item: { ...data },
					TableName: options.tableName,
					ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL,
				}),
			);

			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} PutCommand`,
					message: 'successful',
					data: { consumedCapacity: ConsumedCapacity?.CapacityUnits },
				});
			}

			return data as TType;
		},

		/**
		 * Queries items from the DynamoDB table (`QueryCommand`), optionally
		 * following pagination until every matching page has been fetched.
		 *
		 * Builds the command in this order, each step logged (when
		 * `enableDebug`) right after it is applied:
		 * 1. `conditions` → `KeyConditionExpression` (equality on the partition
		 *    key / index key — this is a `Query`, not a `Scan`).
		 * 2. `searchTerms` → a `contains(...)` `FilterExpression` OR-ed across
		 *    every listed property (the literal `'password'` property is always
		 *    excluded from search, even if listed).
		 * 3. `filter` → additional equality conditions AND-ed onto the same
		 *    `FilterExpression`.
		 *
		 * Any attribute name colliding with a DynamoDB reserved word (see
		 * `AWS_DYNAMODB_RESERVED_WORDS`) is automatically rewritten to an
		 * `ExpressionAttributeNames` placeholder in all three steps.
		 *
		 * @param filter Additional equality filter conditions, applied via
		 *   `FilterExpression` (post-query filtering — does not reduce RCU cost).
		 * @param conditions Key conditions for the query (`KeyConditionExpression`);
		 *   typically the partition key, and the sort key when narrowing further.
		 * @param indexName Secondary index to query instead of the base table.
		 * @param limit Maximum number of items to return per DynamoDB page
		 *   (`Limit`). Independent of `returnAll` — with `returnAll: true` this
		 *   only bounds each underlying page, not the total result size.
		 * @param returnAll When `true`, keeps querying subsequent pages
		 *   (`ExclusiveStartKey`/`LastEvaluatedKey`) until DynamoDB reports no
		 *   more results. When `false` (default), returns after a single page.
		 * @param paginationData A previous call's `nextPageToken`, to resume
		 *   from where that call left off.
		 * @param searchTerms Case-sensitive `contains` text search across the
		 *   listed properties.
		 * @param searchTerms.properties Properties to search within.
		 * @param searchTerms.value The value every listed property is checked
		 *   for containment of.
		 * @param select Properties to include in each returned item
		 *   (`ProjectionExpression`). Omit to return every attribute.
		 * @returns `data` — every matched item across all fetched pages — and
		 *   `nextPageToken`, the last page's `LastEvaluatedKey` (`undefined` once
		 *   the result set is exhausted).
		 */
		query: async ({
			filter,
			conditions,
			indexName,
			limit,
			returnAll = false,
			paginationData,
			searchTerms,
			select = [],
		}: {
			conditions: Partial<TType>;
			filter: Partial<TType>;
			limit?: number;
			indexName?: TTableIndexType;
			returnAll?: boolean;
			paginationData?: Partial<TType>;
			select?: (keyof TType)[];
			searchTerms?: {
				properties: (keyof TType)[];
				value: string | number | boolean;
			};
		}) => {
			let exclusiveStartKey: TType;
			let queryResponse: QueryCommandOutput;
			let responseData: TType[] = [];
			let consumedCapacity = 0;

			const queryParam: QueryCommandInput = {
				TableName: options.tableName,
				ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL,
			};

			if (conditions && Object.keys(conditions).length) {
				Object.entries(conditions).map(([key, value]) => {
					const rawKey = key;
					const modifiedRawKey = `:${key}`;
					// first check if aws dynamoDB reserved key is present
					if (AWS_DYNAMODB_RESERVED_WORDS.includes(String(key))) {
						key = `#${String(key)}`;
						queryParam.ExpressionAttributeNames = {
							...queryParam.ExpressionAttributeNames,
							[key]: rawKey,
						};
					}

					queryParam.KeyConditionExpression = queryParam?.KeyConditionExpression
						? (queryParam.KeyConditionExpression += ` AND ${key} = ${modifiedRawKey}`)
						: `${key} = ${modifiedRawKey}`;

					queryParam.ExpressionAttributeValues = {
						...queryParam.ExpressionAttributeValues,
						[modifiedRawKey]: value,
					};
				});
				if (options?.options?.enableDebug) {
					consoleLog({
						context: `${debugContext} QueryCommand`,
						message: 'KeyConditions applied',
						data: queryParam,
					});
				}
			}

			if (indexName) {
				queryParam.IndexName = indexName as string;
			}

			if (limit) {
				queryParam.Limit = limit;
			}

			if (select.length) {
				queryParam.ProjectionExpression = select.length
					? [...new Set(select)].toString()
					: undefined;
			}

			if (paginationData && Object.keys(paginationData).length) {
				queryParam.ExclusiveStartKey = paginationData;
			}

			// uses only contain operator cus is search
			if (searchTerms?.properties.length && searchTerms?.value) {
				const properties = [
					...new Set(
						searchTerms.properties.filter(
							(property) => property !== 'password',
						),
					),
				];

				properties.map((property, index) => {
					const rawProperty = property;
					// first check if aws dynamoDB reserved key is presence
					if (AWS_DYNAMODB_RESERVED_WORDS.includes(String(property))) {
						property = `#${String(property)}_`;
						queryParam.ExpressionAttributeNames = {
							...queryParam.ExpressionAttributeNames,
							[property]: rawProperty as string,
						};
					}
					queryParam.FilterExpression =
						index === 0
							? `contains(${String(property)}, :searchKeyword)`
							: (queryParam.FilterExpression += ` OR contains(${String(property)}, :searchKeyword)`);
					queryParam.ExpressionAttributeValues = {
						...queryParam.ExpressionAttributeValues,
						':searchKeyword': searchTerms.value,
					};
				});
				if (options?.options?.enableDebug) {
					consoleLog({
						context: `${debugContext} QueryCommand`,
						message: 'Applied search/filter',
						data: queryParam,
					});
				}
			}

			if (filter && Object.keys(filter).length) {
				Object.entries(filter).map(([key, value]) => {
					const rawKey = key;
					const modifiedRawKey = `:${key}`;

					if (AWS_DYNAMODB_RESERVED_WORDS.includes(String(key))) {
						key = `#${String(key)}`;
						queryParam.ExpressionAttributeNames = {
							...queryParam.ExpressionAttributeNames,
							[key]: rawKey,
						};
					}

					const filterExpressionValue = `${key} = ${modifiedRawKey}`;

					if (queryParam.FilterExpression) {
						queryParam.FilterExpression += ` AND ${filterExpressionValue}`;
					} else {
						queryParam.FilterExpression = filterExpressionValue;
					}
					queryParam.ExpressionAttributeValues = {
						...queryParam.ExpressionAttributeValues,
						[modifiedRawKey]: value,
					};
				});

				if (options?.options?.enableDebug) {
					consoleLog({
						context: `${debugContext} QueryCommand`,
						message: 'Applied FilterExpression',
						data: queryParam,
					});
				}
			}

			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} QueryCommand`,
					message: 'Calling with',
					data: queryParam,
				});
			}

			do {
				queryResponse = await dynamoDbClientInstance.send(
					new QueryCommand(queryParam),
				);
				responseData = [...responseData, ...(queryResponse.Items as TType[])];
				exclusiveStartKey = queryResponse.LastEvaluatedKey as TType;
				queryParam.ExclusiveStartKey = queryResponse.LastEvaluatedKey as TType;
				consumedCapacity =
					consumedCapacity + queryResponse.ConsumedCapacity?.CapacityUnits;
			} while (
				queryResponse.LastEvaluatedKey &&
				Object.keys(queryResponse.LastEvaluatedKey).length &&
				returnAll
			);

			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} QueryCommand`,
					message: 'successful',
					data: { consumedCapacity },
				});
			}

			return {
				data: responseData,
				nextPageToken: exclusiveStartKey,
			};
		},

		/**
		 * Retrieves a single item from the DynamoDB table by its key
		 * (`GetCommand`).
		 * @param key The item's primary key (and sort key, if the table has one).
		 * @param select Properties to include in the result (`ProjectionExpression`).
		 *   Omit to return every attribute.
		 * @returns The retrieved item, or `undefined` if no item has that key.
		 */
		getOne: async ({
			key,
			select = [],
		}: {
			/** primaryKey and sortKey only */
			key: Partial<TType>;
			select?: (keyof TType)[];
		}) => {
			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} GetCommand`,
					message: 'Calling with',
					data: key,
				});
			}

			const response = await dynamoDbClientInstance.send(
				new GetCommand({
					Key: key,
					ProjectionExpression: select.length
						? [...new Set(select)].toString()
						: undefined,
					TableName: options.tableName,
					ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL,
				}),
			);
			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} GetCommand`,
					message: 'successful',
					data: { consumedCapacity: response.ConsumedCapacity?.CapacityUnits },
				});
			}
			return response.Item as TType;
		},

		/**
		 * Retrieves multiple items from the DynamoDB table by their keys
		 * (`BatchGetCommand`).
		 *
		 * Always follows `UnprocessedKeys` until DynamoDB has returned every
		 * requested item (or failed to find it) — unlike {@link query}, there is
		 * currently no way to fetch only a single page here.
		 *
		 * @param keys The items' primary keys (and sort keys, if the table has one).
		 *   Returns `{ data: [], nextPageData: undefined }` immediately if empty.
		 * @param select Properties to include in each result (`ProjectionExpression`).
		 *   Omit to return every attribute.
		 * @param returnAll Accepted for symmetry with `query`'s option of the same
		 *   name, but currently unused — this method always fetches every page
		 *   regardless of its value.
		 * @returns `data` — every retrieved item across all fetched pages — and
		 *   `nextPageData` (DynamoDB's `UnprocessedKeys`), which is always empty
		 *   by the time this resolves, since the method only returns once there
		 *   are no more unprocessed keys left to retry.
		 */
		getMany: async ({
			keys,
			select = [],
		}: {
			/** Array of primaryKey and sortKey only */
			keys: Partial<TType>[];
			select?: (keyof TType)[];
			returnAll?: boolean;
		}) => {
			let queryResponse: BatchGetCommandOutput;
			let responseData: TType[] = [];
			// Always overwritten before being read — the loop below is a `do-while`,
			// so it runs (and reassigns this) at least once before the value is used.
			let consumedCapacity: number;

			if (!keys || !keys.length) {
				return {
					data: [] as TType[],
					nextPageData: undefined,
				};
			}

			const batchGetInput: BatchGetCommandInput = {
				ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL,
				RequestItems: {
					[options.tableName]: {
						Keys: keys,
						ProjectionExpression: select.length
							? [...new Set(select)].toString()
							: undefined,
					},
				},
			};

			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} BatchGetCommand`,
					message: 'Calling with',
					data: batchGetInput,
				});
			}

			do {
				queryResponse = await dynamoDbClientInstance.send(
					new BatchGetCommand(batchGetInput),
				);
				responseData = [
					...responseData,
					...(queryResponse.Responses[options?.tableName] as TType[]),
				];
				batchGetInput.RequestItems = queryResponse.UnprocessedKeys;
				consumedCapacity = queryResponse.ConsumedCapacity.reduce(
					(total, capacity) => total + capacity.CapacityUnits,
					0,
				);
			} while (
				queryResponse.UnprocessedKeys &&
				Object.keys(queryResponse.UnprocessedKeys).length
			);

			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} BatchGetCommand`,
					message: 'successful',
					data: { consumedCapacity },
				});
			}

			return {
				data: responseData,
				nextPageData: queryResponse.UnprocessedKeys,
			};
		},

		/**
		 * Updates a single item in the DynamoDB table (`UpdateCommand`), setting
		 * only the attributes present in `data` — every other attribute on the
		 * existing item is left untouched.
		 *
		 * `data` is validated against `options.schema.partial()` (every field
		 * optional) via {@link validateSchema} before the `UpdateExpression` is
		 * built — throws {@link CustomException} and never calls DynamoDB if
		 * validation fails. Each key in `data` becomes one `SET` clause, with
		 * DynamoDB reserved words rewritten to `ExpressionAttributeNames`
		 * placeholders the same way {@link query} does.
		 *
		 * @param key The primary key (and sort key, if the table has one) of the
		 *   item to update.
		 * @param data The attributes to set. Does not need to (and need not)
		 *   include every field of `options.schema` — only the attributes
		 *   present here are updated.
		 * @returns The full updated item, as returned by DynamoDB
		 *   (`ReturnValues: 'ALL_NEW'`).
		 */
		updateOne: async ({
			key,
			data,
		}: {
			/** primaryKey and sortKey only */
			key: Partial<TType>;
			data: Partial<TType>;
		}) => {
			// mapSchemaModifiedDate(data);

			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} UpdateCommand`,
					message: 'Validating data:',
					data,
				});
			}

			await validateSchema({
				schema: options.schema,
				data,
				skipMissingProperties: true,
			});

			const updateParam: UpdateCommandInput = {
				Key: key,
				ReturnValues: 'ALL_NEW',
				TableName: options.tableName,
				ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL,
			};

			Object.entries(data).map(([propertyKey, value]) => {
				const rawKey = propertyKey;
				if (AWS_DYNAMODB_RESERVED_WORDS.includes(propertyKey)) {
					propertyKey = `#${propertyKey}_`;
					updateParam.ExpressionAttributeNames = {
						...updateParam.ExpressionAttributeNames,
						[propertyKey]: rawKey,
					};
				}
				const filterValue = `${propertyKey} = :${propertyKey}`;
				if (updateParam.UpdateExpression) {
					updateParam.UpdateExpression += `, ${filterValue}`;
				} else {
					updateParam.UpdateExpression = `SET ${filterValue}`;
				}
				updateParam.ExpressionAttributeValues = {
					...updateParam.ExpressionAttributeValues,
					[`:${propertyKey}`]: value,
				};
			});

			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} UpdateCommand`,
					message: 'Calling with',
					data: updateParam,
				});
			}

			const response = await dynamoDbClientInstance.send(
				new UpdateCommand(updateParam),
			);

			if (options?.options?.enableDebug) {
				consoleLog({
					context: `${debugContext} UpdateCommand`,
					message: 'successful',
					data: { consumedCapacity: response.ConsumedCapacity?.CapacityUnits },
				});
			}

			return response.Attributes as TType;
		},

		/**
		 * Deletes a single item from the DynamoDB table (`DeleteCommand`).
		 * DynamoDB's delete is idempotent — this resolves to `true` whether or
		 * not an item with `key` actually existed, as long as the request itself
		 * does not error.
		 * @param key The primary key (and sort key, if the table has one) of the
		 *   item to delete.
		 * @returns `true` once the `DeleteCommand` has been sent successfully.
		 */
		delete: async ({
			key,
		}: {
			/** primaryKey and sortKey only */
			key: Partial<TType>;
		}) => {
			await dynamoDbClientInstance.send(
				new DeleteCommand({
					Key: key,
					TableName: options?.tableName,
				}),
			);
			return true;
		},
	};
}
