import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

import { Request, Response } from 'express';
import { ObjectType, IErrorResponse } from 'src/types';


@Catch()
export class AllExceptionFilter implements ExceptionFilter {
	catch(exception: ObjectType, host: ArgumentsHost) {
		const http = host.switchToHttp();
		const response = http.getResponse<Response>();
		const { method, url } = http.getRequest<Request>();
		let statusCode = exception instanceof HttpException ? exception?.getStatus() || HttpStatus.INTERNAL_SERVER_ERROR : HttpStatus.INTERNAL_SERVER_ERROR;
		let message = exception.response?.message as string || exception?.message || 'Error occured in the server!';

		if (message === 'invalid signature') {
			statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
			message = 'Invalid token signature!';
		}
		if (message === 'jwt malformed' || message === 'jwt must be provided') {
			statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
			message = 'Invalid verification token!';
		}
		if (message === 'jwt expired') {
			statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
			message = 'Token is expired!';
		}
		if (message === 'NOT_A_NUMBER') {
			message = 'Not a valid phone number!';
		}

		const error: IErrorResponse = {
			statusCode,
			timestamp: new Date().toISOString(),
			method,
			path: url,
			message
		};

		response.status(statusCode).json({ error, message });
	}
}