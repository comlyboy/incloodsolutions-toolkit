import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { BatchGetCommand, BatchGetCommandInput, BatchGetCommandOutput, DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, TranslateConfig, UpdateCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { plainToInstance } from "class-transformer";
import { validateOrReject, ValidatorOptions } from "class-validator";

import { IBaseId, ObjectType } from "src/interface";

export function initDynamoDbClientWrapper<TSchema extends ObjectType = ObjectType>({ databaseTableName, schema, config, schemaConfig, translationOptions }: {
	databaseTableName: string;
	schema: new () => TSchema;
	config?: DynamoDBClientConfig;
	schemaConfig?: ValidatorOptions;
	translationOptions?: TranslateConfig;
}) {
	const AWS_DYNAMODB_RESERVED_WORDS = ['status', 'name', 'names'];

	const dynamoDbClientInstance = DynamoDBDocumentClient.from(new DynamoDBClient(config), translationOptions);

	return {
		put: async ({ data }: { data: TSchema; }) => {
			const instance = plainToInstance(schema, data);
			await validateOrReject(instance, {
				...schemaConfig,
				whitelist: schemaConfig?.whitelist === false ? schemaConfig?.whitelist : true,
				forbidUnknownValues: schemaConfig?.forbidUnknownValues === false ? schemaConfig?.forbidUnknownValues : true
			});

			await dynamoDbClientInstance.send(new PutCommand({
				Item: { ...data },
				TableName: databaseTableName
			}));
			return data;
		},
		getById: async ({ id, select = [] }: {
			select?: (keyof TSchema)[];
		} & IBaseId) => {
			const response = await dynamoDbClientInstance.send(new GetCommand({
				Key: { id },
				ProjectionExpression: select.length ? [...new Set(['id', ...select])].toString() : undefined,
				TableName: databaseTableName
			}));
			return response.Item as TSchema;
		},

		/** Get many by ids is basically a BatchGet in Dynamo-DB */
		getManyByIds: async ({ ids, select = [] }: {
			ids: string[];
			select?: (keyof TSchema)[];
		}) => {
			let queryResponse: BatchGetCommandOutput;
			let responseData: TSchema[] = [];

			if (!ids || !ids.length) return [] as TSchema[];

			const batchGetInput: BatchGetCommandInput = {
				RequestItems: {
					[databaseTableName]: {
						Keys: [...new Set(ids)].map(id => ({ id })),
						ProjectionExpression: select.length ? [...new Set(['id', ...select])].toString() : undefined
					}
				}
			}

			do {
				queryResponse = await dynamoDbClientInstance.send(new BatchGetCommand(batchGetInput));
				responseData = [...responseData, ...queryResponse.Responses[databaseTableName] as TSchema[]];
				batchGetInput.RequestItems = queryResponse.UnprocessedKeys;
			} while (queryResponse.UnprocessedKeys && Object.keys(queryResponse.UnprocessedKeys).length);

			return {
				data: responseData,
				nextPageData: queryResponse.UnprocessedKeys
			}
		},
		query: () => { },
		updateOne: async ({ id, data }: {
			data: Partial<TSchema>;
		} & IBaseId) => {

			const updateParam: UpdateCommandInput = {
				Key: { id },
				TableName: databaseTableName,
				ReturnValues: 'ALL_NEW',
				// ReturnConsumedCapacity: 'TOTAL'
			}

			Object.entries(data).map(([key, value]) => {
				const rawKey = key;
				if (AWS_DYNAMODB_RESERVED_WORDS.includes(key)) {
					key = `#${key}_`;
					updateParam.ExpressionAttributeNames = {
						...updateParam.ExpressionAttributeNames,
						[key]: rawKey
					};
				}
				const filterValue = `${key} = :${key}`;
				updateParam.UpdateExpression ? updateParam.UpdateExpression += `, ${filterValue}` : updateParam.UpdateExpression = `SET ${filterValue}`;
				updateParam.ExpressionAttributeValues = {
					...updateParam.ExpressionAttributeValues,
					[`:${key}`]: value
				}
			});

			const response = await dynamoDbClientInstance.send(new UpdateCommand(updateParam))
			return response.Attributes as TSchema;
		},
		delete: async ({ id }: { id: string; }) => {
			await dynamoDbClientInstance.send(new DeleteCommand({
				Key: { id }, TableName: databaseTableName
			}));
			return true;
		}
	};

}