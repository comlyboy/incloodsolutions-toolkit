import {
	IsBoolean,
	IsISO8601,
	IsNotEmpty,
	IsOptional,
	IsString,
} from 'class-validator';

import {
	IBaseCreator,
	IBaseDelete,
	IBaseEditor,
} from '@incloodsolutions/toolkit/interface';

/**
 * Base class for Mongoose entities: creation, soft-delete and last-modified audit fields, each
 * validated with `class-validator`. Currently not re-exported from the `mongo` subpath.
 */
export class BaseSchemaEntity
	implements IBaseCreator, IBaseDelete, IBaseEditor
{
	/** ISO 8601 date the record was created. */
	@IsString()
	@IsISO8601()
	@IsNotEmpty()
	createdAtDate: string;

	/** Id of the user who created the record. */
	@IsString()
	@IsOptional()
	createdByUserId?: string;

	/** Soft-delete flag: `true` once the record is deleted. */
	@IsBoolean()
	@IsNotEmpty()
	isDeleted: boolean;

	/** ISO 8601 date the record was deleted. */
	@IsString()
	@IsISO8601()
	@IsOptional()
	deletedAtDate?: string;

	/** Id of the user who deleted the record. */
	@IsString()
	@IsOptional()
	deletedByUserId?: string;

	/** ISO 8601 date of the last change. */
	@IsString()
	@IsISO8601()
	@IsOptional()
	lastModifiedAtDate?: string;

	/** Id of the user who made the last change. */
	@IsString()
	@IsOptional()
	lastModifiedByUserId?: string;
}

// import { IsBoolean, IsISO8601, IsNotEmpty, IsOptional, IsString } from "class-validator";

// import { IBaseCreator, IBaseDelete, IBaseEditor } from "../interface";

// export class BaseSchemaEntity implements IBaseCreator, IBaseDelete, IBaseEditor {

// 	@IsString()
// 	@IsISO8601()
// 	@IsNotEmpty()
// 	createdAtDate: string;

// 	@IsString()
// 	@IsOptional()
// 	createdByUserId?: string;

// 	@IsBoolean()
// 	@IsNotEmpty()
// 	isDeleted: boolean;

// 	@IsString()
// 	@IsISO8601()
// 	@IsOptional()
// 	deletedAtDate?: string;

// 	@IsString()
// 	@IsOptional()
// 	deletedByUserId?: string;

// 	@IsString()
// 	@IsISO8601()
// 	@IsOptional()
// 	lastModifiedAtDate?: string;

// 	@IsString()
// 	@IsOptional()
// 	lastModifiedByUserId?: string;

// }
