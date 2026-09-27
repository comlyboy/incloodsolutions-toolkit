import {
	GetParameterCommand,
	GetParametersByPathCommand,
	GetParametersCommand,
	SSMClient,
	SSMClientConfig,
} from '@aws-sdk/client-ssm';

/**
 * Initialize an AWS Systems Manager (SSM) Parameter Store client wrapper
 * @param config Optional SSM client configuration
 * @returns Object containing methods for reading parameters
 */
export function initSsmParameterClientWrapper({
	config,
}: { config?: SSMClientConfig } = {}) {
	const ssmInstance = new SSMClient(config);

	return {
		/**
		 * Gets a single parameter's value by name
		 * @param name The parameter name, e.g. `/my-app/db-password`
		 * @param withDecryption Decrypt `SecureString` parameters. Defaults to `true`.
		 * @returns The parameter value, or `undefined` if it has none
		 */
		getParameter: async ({
			name,
			withDecryption = true,
		}: {
			name: string;
			withDecryption?: boolean;
		}) => {
			const response = await ssmInstance.send(
				new GetParameterCommand({
					Name: name,
					WithDecryption: withDecryption,
				}),
			);
			return response.Parameter?.Value;
		},

		/**
		 * Gets multiple parameters by their exact names in a single call. AWS
		 * limits this to 10 names per request.
		 * @param names The parameter names to fetch
		 * @param withDecryption Decrypt `SecureString` parameters. Defaults to `true`.
		 * @returns `values` mapping each found name to its value, and
		 *   `invalidParameterNames` listing any names AWS could not find
		 */
		getParameters: async ({
			names,
			withDecryption = true,
		}: {
			names: string[];
			withDecryption?: boolean;
		}) => {
			const response = await ssmInstance.send(
				new GetParametersCommand({
					Names: names,
					WithDecryption: withDecryption,
				}),
			);

			const values = (response.Parameters ?? []).reduce<Record<string, string>>(
				(result, parameter) => {
					if (parameter.Name && parameter.Value !== undefined) {
						result[parameter.Name] = parameter.Value;
					}
					return result;
				},
				{},
			);

			return {
				values,
				invalidParameterNames: response.InvalidParameters ?? [],
			};
		},

		/**
		 * Gets every parameter under a hierarchy path (e.g. all of `/my-app/` at
		 * once), automatically following pagination until every page is read.
		 * @param path The hierarchy path to read, e.g. `/my-app/`
		 * @param recursive Include parameters nested under sub-paths too. Defaults to `true`.
		 * @param withDecryption Decrypt `SecureString` parameters. Defaults to `true`.
		 * @returns An object mapping each parameter's full name to its value
		 */
		getParametersByPath: async ({
			path,
			recursive = true,
			withDecryption = true,
		}: {
			path: string;
			recursive?: boolean;
			withDecryption?: boolean;
		}) => {
			const values: Record<string, string> = {};
			let nextToken: string | undefined;

			do {
				const response = await ssmInstance.send(
					new GetParametersByPathCommand({
						Path: path,
						Recursive: recursive,
						WithDecryption: withDecryption,
						NextToken: nextToken,
					}),
				);

				for (const parameter of response.Parameters ?? []) {
					if (parameter.Name && parameter.Value !== undefined) {
						values[parameter.Name] = parameter.Value;
					}
				}

				nextToken = response.NextToken;
			} while (nextToken);

			return values;
		},
	};
}
