/**
 * Standard, user-facing message strings for API responses and errors.
 *
 * Each member's **value is the message text itself** (not a code), so it can be
 * returned to a client or thrown directly:
 *
 * ```ts
 * throw new CustomException(ResponseMessageEnum.USER_NOT_FOUND, 404);
 * return { message: ResponseMessageEnum.UPDATE_SUCCESS, data };
 * ```
 *
 * Members are grouped by concern: General, CRUD, Authentication, Authorization,
 * User, Password, Email, Status, Files, and Pagination / Search. Some values are
 * intentionally identical (e.g. `WRONG_PASSWORD` and `INVALID_CREDENTIALS`) so
 * call sites can stay semantically specific while presenting one message.
 */
export enum ResponseMessageEnum {
	// General
	SUCCESS = 'Operation completed successfully.',
	INTERNAL_SERVER_ERROR = 'An unexpected error occurred. Please try again later.',
	NOT_SUCCESS = 'The operation was not successful. Please try again.',
	BAD_REQUEST = 'Invalid request. Please check your input.',
	INVALID_REQUEST = 'The request is invalid.',
	VALIDATION_FAILED = 'Validation failed. Please check your input.',
	NOT_FOUND = 'The requested resource was not found.',
	CONFLICT = 'The request conflicts with the current state of the resource.',

	// CRUD
	ADD_SUCCESS = 'Added successfully.',
	CREATED_SUCCESS = 'Created successfully.',
	UPDATE_SUCCESS = 'Updated successfully.',
	DELETE_SUCCESS = 'Deleted successfully.',
	RETRIEVED_SUCCESS = 'Retrieved successfully.',
	COMPLETED_SUCCESS = 'Completed successfully.',

	// Authentication
	LOGIN_SUCCESS = 'Logged in successfully.',
	LOGOUT_SUCCESS = 'Logged out successfully.',
	WRONG_PASSWORD = 'Invalid login credentials.',
	INVALID_CREDENTIALS = 'Invalid login credentials.',
	UNAUTHENTICATED = 'Authentication is required. Please log in.',
	UNAUTHORIZED = 'You are not authorized to perform this action.',
	INVALID_TOKEN = 'The authentication token is invalid.',
	TOKEN_EXPIRED = 'The authentication token has expired.',
	LOGIN_SESSION_EXPIRED = 'Your session has expired. Please log in again.',
	ACCOUNT_LOCKED = 'Your account has been locked. Please contact support.',
	ACCOUNT_DISABLED = 'Your account has been disabled. Please contact support.',
	ACCOUNT_NOT_VERIFIED = 'Your account has not been verified.',
	EMAIL_ALREADY_VERIFIED = 'Your email address is already verified.',

	// Authorization
	FORBIDDEN = 'You do not have permission to perform this action.',
	ROLE_MISMATCHED = 'You do not have permission to perform this action.',
	INSUFFICIENT_PERMISSIONS = 'You do not have sufficient permissions to perform this action.',

	// User
	USER_NOT_FOUND = 'User not found.',
	USER_ALREADY_EXISTS = 'A user with these details already exists.',
	USER_NOT_EXIST = 'User does not exist.',
	USER_VERIFICATION_FAILED = 'Unable to verify the user account.',
	USER_SUSPENDED = 'User suspended successfully.',
	USER_UNSUSPENDED = 'User unsuspended successfully.',

	// Password
	PASSWORD_CHANGED = 'Password changed successfully.',
	PASSWORD_RESET = 'Password reset successfully.',
	PASSWORD_RESET_LINK_SENT = 'Password reset instructions have been sent.',
	PASSWORD_MISMATCH = 'Passwords do not match.',
	CURRENT_PASSWORD_INCORRECT = 'The current password is incorrect.',
	PASSWORD_TOO_WEAK = 'The password does not meet the required security criteria.',

	// Email
	EMAIL_SENT = 'Email sent successfully.',
	EMAIL_ALREADY_EXISTS = 'An account with this email address already exists.',
	INVALID_EMAIL = 'Please provide a valid email address.',

	// Status
	SUSPEND_SUCCESS = 'Suspended successfully.',
	UNSUSPEND_SUCCESS = 'Unsuspended successfully.',
	ACTIVATED_SUCCESS = 'Activated successfully.',
	DEACTIVATED_SUCCESS = 'Deactivated successfully.',

	// Files
	FILE_NOT_FOUND = 'File not found.',
	INVALID_FILE_TYPE = 'The uploaded file type is not supported.',
	FILE_TOO_LARGE = 'The uploaded file is too large.',

	// Pagination / Search
	NO_RESULTS_FOUND = 'No results found.',
	SEARCH_FAILED = 'Unable to complete the search. Please try again.',
}
