export function logDebugger(context: string, message: string) {
	const ctx = context ? `[${context}]` : '';
	console.log(`${new Date().toISOString()} - LOG [${ctx}] ${message}`);
}