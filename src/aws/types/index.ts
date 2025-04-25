import { IsISO8601, IsNotEmpty, IsString } from "class-validator";

export class BaseSchemaEntity {

	@IsString()
	@IsNotEmpty()
	@IsISO8601()
	createdAtDate: string;

}