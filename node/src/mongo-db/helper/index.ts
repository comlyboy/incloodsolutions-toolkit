import { Schema, SchemaDefinition, SchemaOptions } from "mongoose";

import { ObjectType } from "@incloodsolutions/toolkit";

/**
 * Creates a Mongoose {@link Schema} with project-wide defaults applied.
 *
 * Defaults (each overridable through `options`):
 * - `strict: 'throw'` — unknown paths raise an error instead of being dropped.
 * - `toJSON.virtuals: true` and `toObject.virtuals: true` — virtual properties
 *   (including `id`) are included when a document is serialised.
 *
 * @typeParam TModel - The document shape.
 * @param fields - Mongoose {@link SchemaDefinition} describing the paths.
 * @param options - Optional {@link SchemaOptions}. Merged over the defaults above.
 * @returns The configured `Schema<TModel>`.
 *
 * @example
 * const UserSchema = initMongooseSchema<UserModel>(
 *   { name: { type: String, required: true }, email: String },
 *   { timestamps: true },
 * );
 */
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