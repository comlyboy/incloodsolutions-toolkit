export class CustomException extends Error {
	statusCode: number;
	message: string
	constructor(message: any, statusCode = 400) {
		super(message);
		this.name = this.constructor.name;
		this.statusCode = statusCode;
		this.message = message;

		// Maintains proper stack trace (only in V8 environments)
		if (typeof Error.captureStackTrace === 'function') {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}