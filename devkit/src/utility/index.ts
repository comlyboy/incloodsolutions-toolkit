/** Log beautifully without library */
export function logDebugger(
	context: string,
	message: string,
	data?: any,
	options?: {
		prettify?: boolean;
		ignoreDate?: boolean;
	}
) {
	const yellowColor = "\x1b[33m";
	const resetColor = '\x1b[0m';
	const greenColor = '\x1b[32m';

	const ctx = context
		? options?.prettify
			? `${yellowColor}[${context}]${resetColor} `
			: `[${context}] `
		: '';

	const logLabel = options?.prettify ? `${greenColor}LOG${resetColor}` : 'LOG';
	const logMessage = options?.prettify ? `${greenColor}${message}${resetColor}` : message;
	const finalMessage = `${options?.ignoreDate ? '' : new Date().toUTCString()} - ${logLabel} ${ctx}${logMessage}`;
	console.log(finalMessage, data || '');
}