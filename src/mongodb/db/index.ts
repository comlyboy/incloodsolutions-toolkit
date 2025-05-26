import { ValidatorOptions } from "class-validator";
import { IBaseEnableDebug, ObjectType } from "../../interface";
import { CollectionOptions, MongoClient } from "mongodb";

export function initMongoDbClientWrapper<TType extends ObjectType = any, TSchemaType extends ObjectType = any>(options: {
	/** Mongo-db collection name */
	readonly collectionName: string;
	/** Class with class-validator and class-transformer decorators @ */
	readonly schema: new () => TSchemaType;
	/** Collection options */
	readonly collectionOptions?: CollectionOptions;
	/** Schema validation options */
	readonly schemaConfig?: ValidatorOptions;
	/** Debuging context, only when `enableDebug` is `true` */
	readonly debugContext?: string;
} & Partial<IBaseEnableDebug>) {

	const debugContext = `${options?.debugContext || ''} | DynamoDb Wrapper`;


	const client = new MongoClient('');

	const collection = client.db().collection<TType>(options.collectionName, options?.collectionOptions);

	return {
		collection,
		database: client.db(),
		create: async () => {
			const data = await collection.insertOne({}, {});
		},
		query: async () => {
			const data = await collection.find({}, {})
		},
		getOne: async (id: string) => {
			return await collection.findOne({ _id: id as any }, {});
		},
		getMany: async () => {
			return await collection.find({}, {}).toArray();
		},
		deleteOne: async (id: string) => {
			const { deletedCount } = await collection.deleteOne({ _id: id as any });
			return deletedCount > 0;
		},

	}




}