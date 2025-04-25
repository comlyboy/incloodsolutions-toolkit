import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { BatchGetCommand, BatchGetCommandInput, BatchGetCommandOutput, DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, QueryCommandInput, QueryCommandOutput, TranslateConfig, UpdateCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { plainToInstance } from "class-transformer";
import { validateOrReject, ValidatorOptions } from "class-validator";

import { ObjectType } from "../../interface";

export function initDynamoDbClientWrapper<TType extends ObjectType, TTableIndexType = string>(options: {
	/** Dynamo-db table name */
	readonly tableName: string;
	/** Class with class-validator decorators */
	readonly schema: new () => ObjectType;
	/** Dynamo-db primary key name */
	readonly primaryKeyName: string;
	/** Dynamo-db sort key name */
	readonly sortKeyName?: string;
	/** Dynamo-db client configuration */
	readonly config?: DynamoDBClientConfig;
	/** Schema validation options */
	readonly schemaConfig?: ValidatorOptions;
	/** Dynamo-db object translation options */
	readonly translationConfig?: TranslateConfig;
	/** options */
	readonly options?: {
		/** Primary key ID type, @default uuid */
		readonly primaryKeyIdType?: 'uuid' | 'customUuid' | 'epochTimestamp';
		/** To check  */
		readonly autoGeneratePrimaryKeyId?: boolean;
	};
}) {
	const AWS_DYNAMODB_RESERVED_WORDS = ['status', 'name', 'names'];

	const dynamoDbClientInstance = DynamoDBDocumentClient.from(new DynamoDBClient(options?.config), options?.translationConfig);

	return {

		/** Put command */
		put: async ({ data }: { data: Partial<TType>; }) => {
			const instance = plainToInstance(options.schema, data);
			await validateOrReject(instance, {
				...options?.schemaConfig,
				whitelist: options?.schemaConfig?.whitelist === false ? options.schemaConfig.whitelist : true,
				forbidUnknownValues: options?.schemaConfig?.forbidUnknownValues === false ? options.schemaConfig.forbidUnknownValues : true
			});

			await dynamoDbClientInstance.send(new PutCommand({
				Item: { ...data },
				TableName: options.tableName
			}));
			return data as TType;
		},

		getOne: async ({ key, select = [] }: {
			/** primaryKey and sortKey only */
			key: Partial<TType>;
			select?: (keyof TType)[];
		}) => {
			const response = await dynamoDbClientInstance.send(new GetCommand({
				Key: key,
				ProjectionExpression: select.length ? [...new Set(select)].toString() : undefined,
				TableName: options.tableName
			}));
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

			return {
				data: responseData,
				nextPageData: queryResponse.UnprocessedKeys ? JSON.stringify(queryResponse.UnprocessedKeys) : undefined
			}
		},

		query: async ({ filter, indexName, limit, returnAll = false, paginationData, searchTerms, select = [] }: {
			filter: Partial<TType>;
			limit?: number;
			indexName?: TTableIndexType;
			returnAll?: boolean;
			paginationData?: Partial<TType>;
			select?: (keyof TType)[];
			searchTerms?: { properties: (keyof TType)[], value: string | number | boolean };
		}) => {
			let exclusiveStartKey: TType;
			let queryResponse: QueryCommandOutput;
			let responseData: TType[] = [];

			// if (options.tableIndexNames && options.tableIndexNames.length && indexName && !options.tableIndexNames.some(index => indexName)) {
			// 	throw Error
			// }

			const queryParam: QueryCommandInput = {
				TableName: options.tableName
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
					if (this.AWS_DYNAMODB_RESERVED_KEYS.includes(String(property))) {
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
					const filterValue = `${key} = :${key}`;
					queryParam.FilterExpression ? queryParam.FilterExpression += ` AND ${filterValue}` : queryParam.FilterExpression = filterValue
					queryParam.ExpressionAttributeValues = {
						...queryParam.ExpressionAttributeValues,
						[`:${key}`]: value
					}
				});
			}

			do {
				queryResponse = await dynamoDbClientInstance.send(new QueryCommand(queryParam));
				responseData = [...responseData, ...queryResponse.Items as TType[]];
				exclusiveStartKey = queryResponse.LastEvaluatedKey as TType;
				queryParam.ExclusiveStartKey = queryResponse.LastEvaluatedKey as TType;
			} while ((queryResponse.LastEvaluatedKey && Object.keys(queryResponse.LastEvaluatedKey).length) && returnAll);
			return {
				data: responseData,
				nextPageToken: exclusiveStartKey
			};
		},

		updateOne: async ({ key, data }: {
			/** primaryKey and sortKey only */
			key: Partial<TType>;
			data: Partial<TType>;
		}) => {
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

			const response = await dynamoDbClientInstance.send(new UpdateCommand(updateParam))
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