import { Response } from "express";
import { IErrorResponse, ObjectType } from "src/interface";

export class ApiResult<TBody extends ObjectType | ObjectType[]> {
	readonly data: TBody;
	readonly message: string;
	readonly error: IErrorResponse;

	constructor({ data, message, error }: {
		data?: TBody;
		message?: string;
		error?: IErrorResponse;
	}) {
		this.data = data || null;
		this.message = message || null;
		this.error = error || null;
	}
}


export class ApiResponseBuilder<TBody extends ObjectType | ObjectType[]> {
	constructor(res: Response, status: number, response: ApiResult<TBody>) {
		return res.status(status).json({
			statusCode: status,
			...response
		});
	}
}
