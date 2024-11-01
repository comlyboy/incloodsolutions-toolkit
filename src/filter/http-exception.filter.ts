import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

import { Request, Response } from 'express';
import { ObjectType } from 'src/types';


@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
	catch(exception: HttpException, host: ArgumentsHost) {
		const http = host.switchToHttp();
		const response = http.getResponse<Response>();
		const { method, url } = http.getRequest<Request>();
		let statusCode = exception?.getStatus() || HttpStatus.INTERNAL_SERVER_ERROR;
		let message: string = (exception as ObjectType)?.response?.message || exception?.message || 'Error occured in the server!';
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

		const error = {
			statusCode,
			timestamp: new Date().toISOString(),
			method,
			path: url,
			message
		};

		response.status(statusCode).json({ error, message });
	}
}