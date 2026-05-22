import { writeFile } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

import { CustomException } from '@incloodsolutions/toolkit';


/** Write file to lambda function `/tmp` folder... Errors if not in lambda environment */
export async function writeFileToLambda({ filePath, file }: {
	filePath?: string;
	file: string | NodeJS.ArrayBufferView | File;
}): Promise<string> {
	if (!file) {
		throw new CustomException('File is required');
	}
	if (!isLambdaEnvironment()) {
		throw new CustomException('Not in lambda environment!');
	}

	let fullFilePath: string;

	if (filePath) {
		// Ensure the path starts with /tmp for Lambda security
		fullFilePath = filePath.startsWith('/tmp') ? filePath : path.join('/tmp', filePath);
	} else if (file instanceof File && file.name) {
		// Fallback to File.name if no filePath provided
		fullFilePath = path.join('/tmp', file.name);
	} else {
		throw new CustomException('File path is required');
	}

	if (file instanceof File) {
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		await writeFile(fullFilePath, buffer);
	} else {
		await writeFile(fullFilePath, file);
	}

	return fullFilePath;
}

/** Get file from lambda function `/tmp` folder... Errors if not in lambda environment */
export async function readFileFromLambda(fileName: string) {
	return new Promise<Buffer>((resolve, reject) => {
		try {
			if (!fileName) return null;
			if (!isLambdaEnvironment()) {
				reject('Not in lambda environment!');
			}
			const filePath = path.join('/tmp', fileName);
			if (!existsSync(filePath)) return resolve(null);
			const file = readFileSync(filePath);
			resolve(file);
		} catch (error) {
			reject(error);
		}
	});
}

/** Check if currently in Lambda environment */
export function isLambdaEnvironment() {
	return Boolean(process.env?.LAMBDA_TASK_ROOT || process.env?.AWS_LAMBDA_FUNCTION_NAME);
}
