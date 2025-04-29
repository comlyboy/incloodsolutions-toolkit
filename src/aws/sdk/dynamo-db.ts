import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { BatchGetCommand, BatchGetCommandInput, BatchGetCommandOutput, DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, QueryCommandInput, QueryCommandOutput, TranslateConfig, UpdateCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { plainToInstance } from "class-transformer";
import { validateOrReject, ValidationError, ValidatorOptions } from "class-validator";

import { IBaseEnableDebug, ObjectType } from "../../interface";
import { CustomException } from "../../error";
import { generateCustomUUID, generateDateInNumber, logDebugger } from "../../utility";

export function initDynamoDbClientWrapper<TType extends ObjectType = any, TTableIndexType = string>(options: {
	/** Dynamo-db table name */
	readonly tableName: string;
	/** Class with class-validator and class-transformer decorators @ */
	readonly schema: new () => ObjectType;
	/** Options for primary and sort keys */
	readonly compositePrimaryKeyOptions: {
		/** Dynamo-db primary key name */
		readonly primaryKeyName: string;
		/** Dynamo-db sort key name @default undefined */
		readonly sortKeyName?: string;
		/**
		 * if 'ignoreAutoGeneratingPrimaryKeyId' is `false` or `undefined`. Primary key ID type,
		 * @default uuid
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
	/** Enable debuging mode */
	readonly enableDebug?: boolean;
} & Partial<IBaseEnableDebug>) {
	const AWS_DYNAMODB_RESERVED_WORDS = ['status', 'name', 'names', 'type', 'types'];

	if (!options?.compositePrimaryKeyOptions?.primaryKeyName) {
		throw new CustomException('DynamoDB Primary key cannot be null/undefined!', 422)
	}

	const dynamoDbClientInstance = DynamoDBDocumentClient.from(new DynamoDBClient(options?.config), options?.translationConfig);

	async function validateSchema<TShema, TData>(data: TData, ignoreMissingProperties = false) {
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

		try {
			const instance = plainToInstance(options.schema, data);
			if (options?.enableDebug) {
				logDebugger('Dynamo-DB Wrapper Validator', 'Validating entity instance:', instance);
			}
			await validateOrReject(instance, {
				...options?.schemaConfig,
				enableDebugMessages: options?.schemaConfig?.enableDebugMessages || options?.enableDebug,
				whitelist: options?.schemaConfig?.whitelist === false ? options.schemaConfig.whitelist : true,
				forbidUnknownValues: options?.schemaConfig?.forbidUnknownValues === false ? options.schemaConfig.forbidUnknownValues : true,
				skipMissingProperties: ignoreMissingProperties
			});
			return instance;
		} catch (errors) {
			throw new CustomException(flattenValidationErrors(errors), 400);
		}
	}

	function mapSchemaPrimaryKey(data: Partial<TType>) {
		if (options?.compositePrimaryKeyOptions?.ignoreAutoGeneratingPrimaryKeyId) return data;
		if (options.compositePrimaryKeyOptions.primaryKeyIdType === 'timestampUuid') {
			(data as any)[options?.compositePrimaryKeyOptions?.primaryKeyName] = `${generateDateInNumber()}-${generateCustomUUID()}`
		} else if (options.compositePrimaryKeyOptions.primaryKeyIdType === 'epochTimestamp') {
			(data as any)[options?.compositePrimaryKeyOptions?.primaryKeyName] = `${Date.now()}`
		} else {
			(data as any)[options?.compositePrimaryKeyOptions?.primaryKeyName] = generateCustomUUID();
		}
		return data;
	}

	return {

		/** Put command */
		put: async ({ data }: { data: Partial<TType>; }) => {
			mapSchemaPrimaryKey(data);
			if (options?.enableDebug) {
				logDebugger('Dynamo-DB Wrapper PUT', 'Validating data:', data);
			}
			await validateSchema(data);

			if (options?.enableDebug) {
				logDebugger('Dynamo-DB Wrapper PUT', 'Sending PutCommand', data);
			}
			const { ConsumedCapacity } = await dynamoDbClientInstance.send(new PutCommand({
				Item: { ...data },
				TableName: options.tableName
			}));

			if (options?.enableDebug) {
				logDebugger('Dynamo-DB Wrapper PUT', 'Put operation successful', ConsumedCapacity);
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

			const queryParam: QueryCommandInput = {
				TableName: options.tableName
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

					queryParam.KeyConditionExpression = `${key} = ${modifiedRawKey}`;
					queryParam.ExpressionAttributeValues = {
						...queryParam.ExpressionAttributeValues,
						[modifiedRawKey]: value
					};
				});

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
			}

			if (options?.enableDebug) {
				logDebugger('Dynamo-DB Wrapper Query', 'Sending query operation with', queryParam);
			}

			do {
				queryResponse = await dynamoDbClientInstance.send(new QueryCommand(queryParam));
				responseData = [...responseData, ...queryResponse.Items as TType[]];
				exclusiveStartKey = queryResponse.LastEvaluatedKey as TType;
				queryParam.ExclusiveStartKey = queryResponse.LastEvaluatedKey as TType;
			} while ((queryResponse.LastEvaluatedKey && Object.keys(queryResponse.LastEvaluatedKey).length) && returnAll);

			if (options?.enableDebug) {
				logDebugger('Dynamo-DB Wrapper Query', 'Query operation successful', responseData);
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
				logDebugger('Dynamo-DB Wrapper Get', 'Sending get operation with', key);
			}

			const response = await dynamoDbClientInstance.send(new GetCommand({
				Key: key,
				ProjectionExpression: select.length ? [...new Set(select)].toString() : undefined,
				TableName: options.tableName
			}));
			if (options?.enableDebug) {
				logDebugger('Dynamo-DB Wrapper Get', 'GetCommand operation successful');
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

			if (!keys || !keys.length) {
				return {
					data: [] as TType[],
					nextPageData: undefined
				}
			};

			if (options?.enableDebug) {
				logDebugger('Dynamo-DB Wrapper BatchGet', 'Sending BatchGet operation with', keys);
			}


			const batchGetInput: BatchGetCommandInput = {
				RequestItems: {
					[options.tableName]: {
						Keys: keys,
						ProjectionExpression: select.length ? [...new Set(select)].toString() : undefined
					}
				}
			}

			do {
				queryResponse = await dynamoDbClientInstance.send(new BatchGetCommand(batchGetInput));
				responseData = [...responseData, ...queryResponse.Responses[options?.tableName] as TType[]];
				batchGetInput.RequestItems = queryResponse.UnprocessedKeys;
			} while (queryResponse.UnprocessedKeys && Object.keys(queryResponse.UnprocessedKeys).length);

			if (options?.enableDebug) {
				logDebugger('Dynamo-DB Wrapper BatchGet', 'BatchGet operation successful');
			}

			return {
				data: responseData,
				nextPageData: queryResponse.UnprocessedKeys ? JSON.stringify(queryResponse.UnprocessedKeys) : undefined
			}
		},

		updateOne: async ({ key, data }: {
			/** primaryKey and sortKey only */
			key: Partial<TType>;
			data: Partial<TType>;
		}) => {

			if (options?.enableDebug) {
				logDebugger('Dynamo-DB Wrapper Update', 'Validating data:', data);
			}
			await validateSchema(data, true);

			const updateParam: UpdateCommandInput = {
				Key: key,
				ReturnValues: 'ALL_NEW',
				TableName: options.tableName
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
				logDebugger('Dynamo-DB Wrapper Update', 'Sending update operation with', updateParam);
			}

			const response = await dynamoDbClientInstance.send(new UpdateCommand(updateParam));

			if (options?.enableDebug) {
				logDebugger('Dynamo-DB Wrapper Update', 'Update operation successful', response.ConsumedCapacity);
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