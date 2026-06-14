/**
 * Represents a custom application exception with an HTTP status code.
 *
 * This class extends the native `Error` object and provides additional
 * properties commonly used in APIs and backend applications to indicate
 * the corresponding HTTP response status.
 *
 * Features:
 * - Preserves the standard JavaScript error behaviour.
 * - Adds `status` and `statusCode` properties for compatibility with
 *   different frameworks and libraries.
 * - Automatically sets the error name to the class name.
 * - Preserves the stack trace in V8 environments (Node.js, Chrome).
 *
 * @example
 * throw new CustomException('User not found', 404);
 *
 * @example
 * throw new CustomException('Unauthorized access', 401);
 *
 * @extends Error
 */
export class CustomException extends Error {
	/**
	 * HTTP status code associated with the exception.
	 *
	 * This property exists for compatibility with frameworks that expect
	 * a `status` field on error objects.
	 *
	 * @example
	 * error.status // 404
	 */
	status: number;

	/**
	 * HTTP status code associated with the exception.
	 *
	 * This property mirrors `status` and is provided because some libraries
	 * and middleware expect `statusCode` instead.
	 *
	 * @example
	 * error.statusCode // 404
	 */
	statusCode: number;

	/**
	 * Creates a new custom exception.
	 *
	 * @param message - Human-readable error message describing the failure.
	 * @param statusCode - HTTP status code for the error. Defaults to `400`
	 * (Bad Request).
	 *
	 * @example
	 * new CustomException('Invalid email address');
	 *
	 * @example
	 * new CustomException('Resource not found', 404);
	 */
	constructor(
		message: any,
		statusCode = 400,
		options?: ErrorOptions
	) {
		super(message, options);

		this.status = statusCode;
		this.statusCode = statusCode;
		this.name = this.constructor.name;

		// Maintain proper stack traces in V8 environments.
		if (typeof Error.captureStackTrace === 'function') {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}