import { SendEmailCommand, SESClient, SESClientConfig } from "@aws-sdk/client-ses";

export function initSesClientWrapper({ sourceEmail, config }: {
	sourceEmail: string;
	config?: SESClientConfig;
}) {
	const sesInstance = new SESClient(config);

	return {
		sendEmail: async ({ subject, receivers, message }: {
			subject: string;
			message: {
				content: string;
				type?: 'html' | 'text';
				charset?: 'UTF-8' | 'ISO-8859-1' | 'ISO-8859-2' | 'ISO-8859-5'
			};
			receivers: string[];
		}) => {
			message.type = message.type || 'html';
			message.charset = message.charset || 'UTF-8';

			return await sesInstance.send(new SendEmailCommand({
				Message: {
					Subject: {
						Charset: "UTF-8",
						Data: subject
					},
					Body: {
						Text: message?.type === 'text' ? {
							Data: message.content,
							Charset: message?.charset
						} : undefined,
						Html: message?.type === 'html' ? {
							Data: message.content,
							Charset: message?.charset
						} : undefined
					}
				},
				Source: sourceEmail,
				Destination: { ToAddresses: receivers }
			}));
		},
	};
}