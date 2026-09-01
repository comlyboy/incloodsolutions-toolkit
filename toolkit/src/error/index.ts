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
 * // From a message and an explicit status
 * throw new CustomException('User not found', 404);
 *
 * @example
 * // Re-wrapping an unknown error in a catch block; status defaults to 400
 * try { await doWork(); } catch (error) { throw new CustomException(error); }
 *
 * @extends Error
 */
export class CustomException extends Error {
	/**
	 * The resolved HTTP status code.
	 *
	 * Resolution order: an explicit `statusCode` argument, then a `status` /
	 * `statusCode` found on the wrapped error, then the fallback of `400`.
	 */
	public readonly status: number;

	/**
	 * Alias of {@link CustomException.status}, provided because different
	 * frameworks and libraries read one name or the other.
	 */
	public readonly statusCode: number;

	/**
	 * @param error - The source of the error. May be a message `string`, a native
	 *   `Error`, another `CustomException`, or any error-like object with
	 *   `message` / `status` / `statusCode` fields. Anything else yields a generic
	 *   "An unexpected error occurred." message.
	 * @param statusCode - Explicit HTTP status. Used as the fallback when the
	 *   source carries no status of its own. Defaults to `400`.
	 * @param options - Native `ErrorOptions`. An explicit `options.cause` takes
	 *   precedence over the automatically derived cause.
	 */
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

	/**
	 * Normalises an arbitrary thrown value into a consistent
	 * `{ message, status, cause? }` shape.
	 *
	 * @param error - The value to normalise (string, `Error`, `CustomException`,
	 *   error-like object, or anything else).
	 * @param fallbackStatus - Status to use when the value carries none. Defaults to `400`.
	 * @returns The normalised message, status, and (when available) the original error as `cause`.
	 */
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