import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

import { Request, Response } from 'express';

import { ApiResponseBuilder, ApiResult } from 'src/dto';
import { IErrorResponse, ObjectType } from 'src/interface';


@Catch()
export class AllExceptionFilter implements ExceptionFilter {
	catch(exception: ObjectType, host: ArgumentsHost) {
		const http = host.switchToHttp();
		const response = http.getResponse<Response>();
		const { method } = http.getRequest<Request>();
		let statusCode = exception instanceof HttpException ? exception?.getStatus() || HttpStatus.INTERNAL_SERVER_ERROR : HttpStatus.INTERNAL_SERVER_ERROR;
		let message = exception.response?.message as string || exception?.message || 'Error occured in the server!';
		if (Array.isArray(message)) {
			message = JSON.stringify(message);
		}

		if (message === 'invalid signature' || message === 'jwt malformed' || message === 'jwt must be provided') {
			statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
			message = 'Invalid token signature!';
		}
		if (message === 'jwt expired') {
			statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
			message = 'Token is expired!';
		}

		const error: IErrorResponse = {
			statusCode,
			timestamp: new Date().toISOString(),
			method,
			message
		};

		new ApiResponseBuilder(response, statusCode, new ApiResult({ error, message }));
	}
}