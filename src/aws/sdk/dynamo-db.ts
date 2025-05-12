import { DynamoDBClient, DynamoDBClientConfig, ReturnConsumedCapacity } from "@aws-sdk/client-dynamodb";
import { BatchGetCommand, BatchGetCommandInput, BatchGetCommandOutput, DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, QueryCommandInput, QueryCommandOutput, TranslateConfig, UpdateCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { plainToInstance } from "class-transformer";
import { validate, ValidationError, ValidatorOptions } from "class-validator";

import { IBaseEnableDebug, ObjectType } from "../../interface";
import { CustomException } from "../../error";
import { generateCustomUUID, generateDateInNumber, generateISODate, logDebugger } from "../../utility";

export function initDynamoDbClientWrapper<TType extends ObjectType = any, TTableIndexType = string>(options: {
	/** Dynamo-db table name */
	readonly tableName: string;
	/** Class with class-validator and class-transformer decorators @ */
	readonly schema: new () => ObjectType;
	/** Options for primary and sort keys */
	readonly compositePrimaryKeyOptions?: {
		/** Dynamo-db primary key name @default 'id' */
		readonly primaryKeyName?: string;
		/** Dynamo-db sort key name @default undefined */
		readonly sortKeyName?: string;
		/**
		 * if 'ignoreAutoGeneratingPrimaryKeyId' is `false` or `undefined`. Primary key ID type,
		 * @default timestampUuid
		 */
		readonly primaryKeyIdType?: 'uuid' | 'timestampUuid' | 'epochTimestamp';
		/** To ignore auto-generation of Primary key or not @default false */
		readonly ignoreAutoGeneratingPrimaryKeyId?: boolean;
	}
	/** Dynamo-db client configuration */
	readonly config?: DynamoDBClientConfig;
	/** Schema validation options */
	readonly schemaConfig?: ValidatorOptions;
	/** Dynamo-db object translation options */
	readonly translationConfig?: TranslateConfig;
	/** Debuging context, only when `enableDebug` is `true` */
	readonly debugContext?: string;
	/** Enable debuging mode */
	readonly enableDebug?: boolean;
} & Partial<IBaseEnableDebug>) {
	const AWS_DYNAMODB_RESERVED_WORDS = ['status', 'name', 'names', 'type', 'types'];

	const primaryKeyName = options?.compositePrimaryKeyOptions?.primaryKeyName || 'id';

	const debugContext = `${options?.debugContext || ''} | DynamoDb Wrapper`;

	const dynamoDbClientInstance = DynamoDBDocumentClient.from(new DynamoDBClient(options?.config), options?.translationConfig);

	async function validateSchema<TData>(data: TData, ignoreMissingProperties = false) {
		function flattenValidationErrors(errors: ValidationError[]): string[] {
			return errors.flatMap(error => {
				const currentConstraints = error.constraints ? Object.values(error.constraints).map(constraint => {
					const [first, ...rest] = constraint.split(' ');
					return `'${first}': ${rest.join(' ')}`;
				}) : [];
				const childConstraints = error.children?.length ? flattenValidationErrors(error.children) : [];
				return [...currentConstraints, ...childConstraints];
			});
		}

		const instance = plainToInstance(options.schema, data);
		if (options?.enableDebug) {
			logDebugger(`${debugContext} Validation`, 'Validating entity instance:', instance);
		}
		const errors = await validate(instance, {
			...options?.schemaConfig,
			enableDebugMessages: options?.schemaConfig?.enableDebugMessages || options?.enableDebug,
			whitelist: options?.schemaConfig?.whitelist === false ? options.schemaConfig.whitelist : true,
			// forbidNonWhitelisted: options?.schemaConfig?.forbidNonWhitelisted === false ? options.schemaConfig.forbidNonWhitelisted : true,
			forbidNonWhitelisted: true,
			forbidUnknownValues: options?.schemaConfig?.forbidUnknownValues === false ? options.schemaConfig.forbidUnknownValues : true,
			skipMissingProperties: ignoreMissingProperties
		});
		if (errors.length > 0) {
			throw new CustomException(flattenValidationErrors(errors), 400);
		}
		return instance;
	}

	function mapSchemaCreatedDate(data: Partial<TType>) {
		(data as any)['createdAtDate'] = data?.createdAtDate || generateISODate();
		return data;
	}

	function mapSchemaPrimaryKey(data: Partial<TType>) {
		if (options?.compositePrimaryKeyOptions?.ignoreAutoGeneratingPrimaryKeyId) return data;
		if (options.compositePrimaryKeyOptions?.primaryKeyIdType === 'uuid') {
			(data as any)[primaryKeyName] = generateCustomUUID();
		} else if (options.compositePrimaryKeyOptions?.primaryKeyIdType === 'epochTimestamp') {
			(data as any)[primaryKeyName] = `${Date.now()}`;
		} else {
			(data as any)[primaryKeyName] = `${generateDateInNumber()}-${generateCustomUUID()}`;
		}
		return data;
	}

	return {

		/** Put command */
		put: async ({ data }: { data: Partial<TType>; }) => {
			mapSchemaPrimaryKey(data);
			mapSchemaCreatedDate(data);

			await validateSchema(data);

			const { ConsumedCapacity } = await dynamoDbClientInstance.send(new PutCommand({
				Item: { ...data },
				TableName: options.tableName,
				ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL
			}));

			if (options?.enableDebug) {
				logDebugger(`${debugContext} PutCommand`, 'successful', { consumedCapacity: ConsumedCapacity?.CapacityUnits });
			}

			return data as TType;
		},

		query: async ({ filter, conditions, indexName, limit, returnAll = false, paginationData, searchTerms, select = [] }: {
			conditions: Partial<TType>;
			filter: Partial<TType>;
			limit?: number;
			indexName?: TTableIndexType;
			returnAll?: boolean;
			paginationData?: Partial<TType>;
			select?: (keyof TType)[];
			searchTerms?: { properties: (keyof TType)[]; value: string | number | boolean; };
		}) => {
			let exclusiveStartKey: TType;
			let queryResponse: QueryCommandOutput;
			let responseData: TType[] = [];
			let consumedCapacity = 0;

			const queryParam: QueryCommandInput = {
				TableName: options.tableName,
				ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL
			}

			if (conditions && Object.keys(conditions).length) {
				Object.entries(conditions).map(([key, value]) => {
					const rawKey = key;
					const modifiedRawKey = `:${key}`;
					// first check if aws dynamoDB reserved key is present
					if (AWS_DYNAMODB_RESERVED_WORDS.includes(String(key))) {
						key = `#${String(key)}`;
						queryParam.ExpressionAttributeNames = {
							...queryParam.ExpressionAttributeNames,
							[key]: rawKey
						};
					}

					queryParam.KeyConditionExpression = queryParam?.KeyConditionExpression ? queryParam.KeyConditionExpression += ` AND ${key} = ${modifiedRawKey}` : `${key} = ${modifiedRawKey}`;

					queryParam.ExpressionAttributeValues = {
						...queryParam.ExpressionAttributeValues,
						[modifiedRawKey]: value
					};
				});
				if (options?.enableDebug) {
					logDebugger(`${debugContext} QueryCommand`, 'KeyConditions applied', queryParam);
				}

			}

			if (indexName) {
				queryParam.IndexName = indexName as string;
			}

			if (limit) {
				queryParam.Limit = limit;
			}

			if (select.length) {
				queryParam.ProjectionExpression = select.length ? [...new Set(select)].toString() : undefined;
			}

			if (paginationData && Object.keys(paginationData).length) {
				queryParam.ExclusiveStartKey = paginationData;
			}

			// uses only contain operator cus is search
			if (searchTerms?.properties.length && searchTerms?.value) {
				const properties = [...new Set(searchTerms.properties.filter(property => property !== 'password'))];

				properties.map((property, index) => {
					const rawProperty = property;
					// first check if aws dynamoDB reserved key is presence
					if (AWS_DYNAMODB_RESERVED_WORDS.includes(String(property))) {
						property = `#${String(property)}_`;
						queryParam.ExpressionAttributeNames = {
							...queryParam.ExpressionAttributeNames,
							[property]: rawProperty as string
						};
					}
					queryParam.FilterExpression = index === 0 ? `contains(${String(property)}, :searchKeyword)` : queryParam.FilterExpression += ` OR contains(${String(property)}, :searchKeyword)`;
					queryParam.ExpressionAttributeValues = {
						...queryParam.ExpressionAttributeValues,
						':searchKeyword': searchTerms.value
					};
				});
				if (options?.enableDebug) {
					logDebugger(`${debugContext} QueryCommand`, 'Applied search/filter', queryParam);
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
							[key]: rawKey
						};
					}

					const filterExpressionValue = `${key} = ${modifiedRawKey}`;

					queryParam.FilterExpression ? queryParam.FilterExpression += ` AND ${filterExpressionValue}` : queryParam.FilterExpression = filterExpressionValue
					queryParam.ExpressionAttributeValues = {
						...queryParam.ExpressionAttributeValues,
						[modifiedRawKey]: value
					}
				});

				if (options?.enableDebug) {
					logDebugger(`${debugContext} QueryCommand`, 'Applied FilterExpression', queryParam);
				}
			}

			if (options?.enableDebug) {
				logDebugger(`${debugContext} QueryCommand`, 'Calling with', queryParam);
			}

			do {
				queryResponse = await dynamoDbClientInstance.send(new QueryCommand(queryParam));
				responseData = [...responseData, ...queryResponse.Items as TType[]];
				exclusiveStartKey = queryResponse.LastEvaluatedKey as TType;
				queryParam.ExclusiveStartKey = queryResponse.LastEvaluatedKey as TType;
				consumedCapacity = consumedCapacity + queryResponse.ConsumedCapacity?.CapacityUnits
			} while ((queryResponse.LastEvaluatedKey && Object.keys(queryResponse.LastEvaluatedKey).length) && returnAll);

			if (options?.enableDebug) {
				logDebugger(`${debugContext} QueryCommand`, 'successful', { consumedCapacity });
			}

			return {
				data: responseData,
				nextPageToken: exclusiveStartKey
			};
		},

		getOne: async ({ key, select = [] }: {
			/** primaryKey and sortKey only */
			key: Partial<TType>;
			select?: (keyof TType)[];
		}) => {

			if (options?.enableDebug) {
				logDebugger(`${debugContext} GetCommand`, 'Calling with', key);
			}

			const response = await dynamoDbClientInstance.send(new GetCommand({
				Key: key,
				ProjectionExpression: select.length ? [...new Set(select)].toString() : undefined,
				TableName: options.tableName,
				ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL
			}));
			if (options?.enableDebug) {
				logDebugger(`${debugContext} GetCommand`, 'successful', { consumedCapacity: response.ConsumedCapacity?.CapacityUnits });
			}
			return response.Item as TType;
		},

		/** Get many by ids is basically a BatchGetCommand */
		getMany: async ({ keys, select = [] }: {
			/** Array of primaryKey and sortKey only */
			keys: Partial<TType>[];
			select?: (keyof TType)[];
			returnAll?: boolean;
		}) => {
			let queryResponse: BatchGetCommandOutput;
			let responseData: TType[] = [];
			let consumedCapacity = 0;

			if (!keys || !keys.length) {
				return {
					data: [] as TType[],
					nextPageData: undefined
				}
			};

			const batchGetInput: BatchGetCommandInput = {
				ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL,
				RequestItems: {
					[options.tableName]: {
						Keys: keys,
						ProjectionExpression: select.length ? [...new Set(select)].toString() : undefined
					}
				}
			}

			if (options?.enableDebug) {
				logDebugger(`${debugContext} BatchGetCommand`, 'Calling with', batchGetInput);
			}

			do {
				queryResponse = await dynamoDbClientInstance.send(new BatchGetCommand(batchGetInput));
				responseData = [...responseData, ...queryResponse.Responses[options?.tableName] as TType[]];
				batchGetInput.RequestItems = queryResponse.UnprocessedKeys;
				consumedCapacity = queryResponse.ConsumedCapacity.reduce((total, capacity) => total + capacity.CapacityUnits, 0);
			} while (queryResponse.UnprocessedKeys && Object.keys(queryResponse.UnprocessedKeys).length);

			if (options?.enableDebug) {
				logDebugger(`${debugContext} BatchGetCommand`, 'successful', { consumedCapacity });
			}

			return {
				data: responseData,
				nextPageData: queryResponse.UnprocessedKeys
			}
		},

		updateOne: async ({ key, data }: {
			/** primaryKey and sortKey only */
			key: Partial<TType>;
			data: Partial<TType>;
		}) => {

			if (options?.enableDebug) {
				logDebugger(`${debugContext} UpdateCommand`, 'Validating data:', data);
			}

			await validateSchema(data, true);

			const updateParam: UpdateCommandInput = {
				Key: key,
				ReturnValues: 'ALL_NEW',
				TableName: options.tableName,
				ReturnConsumedCapacity: ReturnConsumedCapacity.TOTAL
			};

			Object.entries(data).map(([propertyKey, value]) => {
				const rawKey = propertyKey;
				if (AWS_DYNAMODB_RESERVED_WORDS.includes(propertyKey)) {
					propertyKey = `#${propertyKey}_`;
					updateParam.ExpressionAttributeNames = {
						...updateParam.ExpressionAttributeNames,
						[propertyKey]: rawKey
					};
				}
				const filterValue = `${propertyKey} = :${propertyKey}`;
				updateParam.UpdateExpression ? updateParam.UpdateExpression += `, ${filterValue}` : updateParam.UpdateExpression = `SET ${filterValue}`;
				updateParam.ExpressionAttributeValues = {
					...updateParam.ExpressionAttributeValues,
					[`:${propertyKey}`]: value
				}
			});

			if (options?.enableDebug) {
				logDebugger(`${debugContext} UpdateCommand`, 'Calling with', updateParam);
			}

			const response = await dynamoDbClientInstance.send(new UpdateCommand(updateParam));

			if (options?.enableDebug) {
				logDebugger(`${debugContext} UpdateCommand`, 'successful', { consumedCapacity: response.ConsumedCapacity?.CapacityUnits });
			}

			return response.Attributes as TType;
		},

		delete: async ({ key }: {
			/** primaryKey and sortKey only */
			key: Partial<TType>;
		}) => {
			await dynamoDbClientInstance.send(new DeleteCommand({
				Key: key,
				TableName: options?.tableName
			}));
			return true;
		}
	};

}