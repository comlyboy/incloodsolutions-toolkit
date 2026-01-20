import { Schema, SchemaDefinition, SchemaOptions } from "mongoose";

import { ObjectType } from "@incloodsolutions/toolkit";

export function initMongooseSchema<TModel extends ObjectType = ObjectType>(fields: SchemaDefinition<TModel>, options?: SchemaOptions<TModel>): Schema<TModel> {
	return new Schema({ ...fields }, {
		...options,
		strict: options?.strict ?? 'throw',
		toJSON: {
			...options?.toJSON,
			virtuals: options?.toJSON?.virtuals ?? true
		},
		toObject: {
			...options?.toObject,
			virtuals: options?.toObject?.virtuals ?? true
		},
	});
}