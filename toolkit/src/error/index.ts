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
	 * HTTP status code.
	 */
	public readonly status: number;

	/**
	 * Alias for `status` for framework compatibility.
	 */
	public readonly statusCode: number;

	constructor(
		error: string | Error | CustomException | unknown,
		statusCode?: number,
		options?: ErrorOptions
	) {
		const normalized = CustomException.normalize(error, statusCode);

		super(normalized.message, {
			...options,
			cause: options?.cause ?? normalized.cause,
		});

		this.name = this.constructor.name;
		this.status = normalized.status;
		this.statusCode = normalized.status;

		// Preserve stack if an Error was wrapped
		if (normalized.cause instanceof Error && normalized.cause.stack) {
			this.stack = normalized.cause.stack;
		} else if (typeof Error.captureStackTrace === "function") {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	private static normalize(
		error: unknown,
		fallbackStatus = 400
	): {
		message: string;
		status: number;
		cause?: Error;
	} {
		// Already a CustomException
		if (error instanceof CustomException) {
			return {
				message: error.message,
				status: error.status,
				cause: error,
			};
		}

		// Native Error
		if (error instanceof Error) {
			const err = error as Error & {
				status?: number;
				statusCode?: number;
			};

			return {
				message: err.message,
				status: err.status ?? err.statusCode ?? fallbackStatus,
				cause: err,
			};
		}

		// String
		if (typeof error === "string") {
			return {
				message: error,
				status: fallbackStatus,
			};
		}

		// Error-like object
		if (error && typeof error === "object") {
			const obj = error as {
				message?: unknown;
				status?: unknown;
				statusCode?: unknown;
			};

			return {
				message:
					typeof obj.message === "string"
						? obj.message
						: "An unexpected error occurred.",
				status:
					typeof obj.status === "number"
						? obj.status
						: typeof obj.statusCode === "number"
							? obj.statusCode
							: fallbackStatus,
			};
		}

		// Everything else
		return {
			message: "An unexpected error occurred.",
			status: fallbackStatus,
		};
	}
}