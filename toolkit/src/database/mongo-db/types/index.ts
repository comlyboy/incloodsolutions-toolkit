// import { IsBoolean, IsISO8601, IsNotEmpty, IsOptional, IsString } from "class-validator";

// import { IBaseCreator, IBaseDelete, IBaseEditor } from "src/interface";

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