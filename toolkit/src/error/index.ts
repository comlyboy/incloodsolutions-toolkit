export class CustomException extends Error {
	status: number;
	// message: string;
	statusCode: number;
	constructor(message: string, statusCode = 400) {
		super(message);
		// this.message = message;
		this.status = statusCode;
		this.statusCode = statusCode;
		this.name = this.constructor.name;

		// Maintains proper stack trace (only in V8 environments)
		if (typeof Error.captureStackTrace === 'function') {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}