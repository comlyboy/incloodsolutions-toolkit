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
		/** Dynamo-db primary key name @default 'id' */
		readonly primaryKeyName?: string;
		/** Dynamo-db sort key name @default undefined */
		readonly sortKeyName?: string;
		/**
		 * if 'ignoreAutoGeneratingPrimaryKeyId' is `false` or `undefined`. Primary key ID type,
		 * @default uuid
		 */
		readonly primaryKeyIdType?: 'uuid' | 'timestampUuid' | 'epochTimestamp';
		/** To ignore auto-generation of Primary key or not @default false */
		readonly ignoreAutoGeneratingPrimaryKeyId?: boolean;
	};
	/** Dynamo-db client configuration */
	readonly config?: DynamoDBClientConfig;
	/** Validation options. */
	readonly validationOptions?: ParseContext<$ZodIssue>;
	/** Dynamo-db object translation options */
	readonly translationConfig?: TranslateConfig;
	readonly options?: {
		readonly timestamp?: boolean;
		/** Debuging context, only when `enableDebug` is `true` */
		readonly debugContext?: string;
	} & Readonly<Partial<IBaseEnableDebug>>;
}) {
	const AWS_DYNAMODB_RESERVED_WORDS = [
		'status',
		'name',
		'names',
		'type',
		'types',
	];
	const primaryKeyName =
		options?.compositePrimaryKeyOptions?.primaryKeyName || 'id';
	const debugContext = `${options?.options?.debugContext || ''} | DynamoDb Wrapper`;
	const dynamoDbClientInstance = DynamoDBDocumentClient.from(
		new DynamoDBClient(options?.config),
		options?.translationConfig,
	);

	/**
	 * Adds or updates the createdAtDate field in the data object
	 * @param data The data object to modify
	 * @returns The modified data object with createdAtDate
	 */
	function mapSchemaCreatedDate(data: Partial<TType>) {
		(data as any)['createdAtDate'] = data?.createdAtDate || generateISODate();
		return data;
	}

	/**
	 * Adds or updates the modifiedAtDate field in the data object
	 * @param data The data object to modify
	 * @returns The modified data object with modifiedAtDate
	 */
	// function mapSchemaModifiedDate(data: Partial<TType>) {
	// 	(data as any)['modifiedAtDate'] = data?.modifiedAtDate || generateISODate();
	// 	return data;
	// }

	/**
	 * Generates and sets the primary key for the data object based on configuration
	 * @param data The data object to modify
	 * @returns The modified data object with primary key
	 */
	function mapSchemaPrimaryKey(data: Partial<TType>) {
		const primaryKeyIdType =
			options.compositePrimaryKeyOptions?.primaryKeyIdType;
		if (
			options?.compositePrimaryKeyOptions?.ignoreAutoGeneratingPrimaryKeyId ===
			true
		) {
			return data;
		}
		if (primaryKeyIdType === 'timestampUuid') {
			(data as any)[primaryKeyName] =
				`${generateDateInNumber()}-${generateCustomUUID()}`;
		} else if (primaryKeyIdType === 'epochTimestamp') {
			(data as any)[primaryKeyName] = `${Date.now()}`;
		} else {
			(data as any)[primaryKeyName] = generateCustomUUID();
		}
		return data;
	}

	return {
		/** Put command */
		/**
		 * Creates a new item in the DynamoDB table
		 * @param data The data to insert into the table
		 * @returns The inserted item data
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
		 * Queries items from the DynamoDB table with various filtering options
		 * @param filter Additional filter conditions
		 * @param conditions Key conditions for the query
		 * @param indexName Optional secondary index name to query
		 * @param limit Maximum number of items to return
		 * @param returnAll Whether to fetch all matching items (pagination)
		 * @param paginationData Token for continuing a previous query
		 * @param searchTerms Search criteria for text search across specified properties
		 * @param select Properties to include in the result
		 * @returns Object containing matched items and pagination token
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
		 * @param key The primary key (and sort key if applicable) of the item
		 * @param select Properties to include in the result
		 * @returns The retrieved item or undefined if not found
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

		/** Get many by ids is basically a BatchGetCommand */
		/**
		 * Retrieves multiple items from the DynamoDB table by their keys
		 * @param keys Array of primary keys (and sort keys if applicable)
		 * @param select Properties to include in the results
		 * @returns Object containing retrieved items and any unprocessed keys
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
		 * Updates a single item in the DynamoDB table
		 * @param key The primary key (and sort key if applicable) of the item to update
		 * @param data The new data to update the item with
		 * @returns The updated item
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
		 * Deletes a single item from the DynamoDB table
		 * @param key The primary key (and sort key if applicable) of the item to delete
		 * @returns true if the deletion was successful
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
