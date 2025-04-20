export class CustomException extends Error {
	statusCode: number;
	constructor(message: string, statusCode = 400) {
		super(message);
		this.name = this.constructor.name;
		this.statusCode = statusCode;

		// Maintains proper stack trace (only in V8 environments)
		if (typeof Error.captureStackTrace === 'function') {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}