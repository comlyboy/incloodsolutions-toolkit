import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { BatchGetCommand, BatchGetCommandInput, BatchGetCommandOutput, DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, QueryCommandInput, QueryCommandOutput, TranslateConfig, UpdateCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { plainToInstance } from "class-transformer";
import { validateOrReject, ValidatorOptions } from "class-validator";

import { IBaseId, ObjectType } from "src/interface";


export function initDynamoDbClientWrapper<TSchema extends ObjectType = ObjectType>(options: {
	readonly databaseTableName: string;
	readonly schema: new () => TSchema;
	readonly config?: DynamoDBClientConfig;
	readonly schemaConfig?: ValidatorOptions;
	readonly sortKeyName?: string;
	readonly primaryKeyName: string;
	readonly translationConfig?: TranslateConfig;
	readonly tableIndexNames?: ObjectType<string>;
}) {
	const AWS_DYNAMODB_RESERVED_WORDS = ['status', 'name', 'names'];

	const dynamoDbClientInstance = DynamoDBDocumentClient.from(new DynamoDBClient(options?.config), options?.translationConfig);

	return {
		put: async ({ data }: { data: TSchema; }) => {
			const instance = plainToInstance(options?.schema, data);

			await validateOrReject(instance, {
				...options?.schemaConfig,
				whitelist: options?.schemaConfig?.whitelist === false ? options?.schemaConfig?.whitelist : true,
				forbidUnknownValues: options?.schemaConfig?.forbidUnknownValues === false ? options?.schemaConfig?.forbidUnknownValues : true
			});

			await dynamoDbClientInstance.send(new PutCommand({
				Item: { ...data },
				TableName: options?.databaseTableName
			}));
			return data;
		},

		getById: async ({ id, select = [] }: {
			select?: (keyof TSchema)[];
		} & IBaseId) => {
			const response = await dynamoDbClientInstance.send(new GetCommand({
				Key: { id },
				ProjectionExpression: select.length ? [...new Set(['id', ...select])].toString() : undefined,
				TableName: options?.databaseTableName
			}));
			return response.Item as TSchema;
		},

		/** Get many by ids is basically a BatchGet in Dynamo-DB */
		getManyByIds: async ({ ids, select = [] }: {
			ids: string[];
			select?: (keyof TSchema)[];
			returnAll?: boolean;
		}) => {
			let queryResponse: BatchGetCommandOutput;
			let responseData: TSchema[] = [];

			if (!ids || !ids.length) return [{
				data: [] as TSchema[],
				nextPageData: null as string
			}];

			const batchGetInput: BatchGetCommandInput = {
				RequestItems: {
					[options?.databaseTableName]: {
						Keys: [...new Set(ids)].map(id => ({ id })),
						ProjectionExpression: select.length ? [...new Set(['id', ...select])].toString() : undefined
					}
				}
			}

			do {
				queryResponse = await dynamoDbClientInstance.send(new BatchGetCommand(batchGetInput));
				responseData = [...responseData, ...queryResponse.Responses[options?.databaseTableName] as TSchema[]];
				batchGetInput.RequestItems = queryResponse.UnprocessedKeys;
			} while (queryResponse.UnprocessedKeys && Object.keys(queryResponse.UnprocessedKeys).length);

			return {
				data: responseData,
				nextPageData: queryResponse.UnprocessedKeys
			}
		},

		query: async ({ filter, indexName, limit, returnAll, paginationData, searchTerms, select }: {
			filter: Partial<ObjectType<keyof TSchema>>;
			limit?: number;
			indexName: typeof options.tableIndexNames[keyof typeof options.tableIndexNames];
			returnAll?: boolean;
			paginationData?: ObjectType;
			select?: (keyof TSchema)[];
			searchTerms?: { properties: (keyof TSchema)[], value: string | number | boolean };
		}) => {
			let exclusiveStartKey: TSchema;
			let queryResponse: QueryCommandOutput;
			let responseData: TSchema[] = [];

			const queryParam: QueryCommandInput = {
				IndexName: indexName,
				TableName: options?.databaseTableName,
				// KeyConditionExpression: 'entityName = :entityName',
				// ExpressionAttributeValues: { ':entityName': entityName }
			}

			if (limit) {
				queryParam.Limit = limit;
			}

			if (select.length) {
				queryParam.ProjectionExpression = select.length ? [...new Set(['id', ...select])].toString() : undefined;
			}

			if (paginationData) {
				queryParam.ExclusiveStartKey = paginationData;
			}

			// uses only contain operator cus is search
			if (searchTerms?.properties.length && searchTerms?.value) {
				const properties = [...new Set(searchTerms.properties.filter(property => property !== 'password'))];

				properties.map((property, index) => {
					const rawProperty = property
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
				responseData = [...responseData, ...queryResponse.Items as TSchema[]];
				exclusiveStartKey = queryResponse.LastEvaluatedKey as TSchema;
				queryParam.ExclusiveStartKey = queryResponse.LastEvaluatedKey as TSchema;
			} while ((queryResponse.LastEvaluatedKey && Object.keys(queryResponse.LastEvaluatedKey).length) && returnAll);
			return { data: responseData, nextPageToken: exclusiveStartKey };
		},

		updateOneById: async ({ id, data }: { data: Partial<TSchema>; } & IBaseId) => {
			const updateParam: UpdateCommandInput = {
				Key: { id },
				TableName: options?.databaseTableName,
				ReturnValues: 'ALL_NEW',
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
			return response.Attributes as TSchema;
		},
		delete: async ({ id }: { id: string; }) => {
			await dynamoDbClientInstance.send(new DeleteCommand({
				Key: { id },
				TableName: options?.databaseTableName
			}));
			return true;
		}
	};

}