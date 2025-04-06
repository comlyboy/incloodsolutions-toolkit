import { SendEmailCommand, SESClient, SESClientConfig } from "@aws-sdk/client-ses";

export function initSesClientWrapper({ sourceEmail, config }: {
	sourceEmail: string;
	config: SESClientConfig;
}) {
	const sesInstance = new SESClient(config);

	return {
		sendEmail: async ({ subject, receivers, message }: {
			receivers: string[];
			subject: string;
			message: string;
		}) => {
			await sesInstance.send(new SendEmailCommand({
				Message: {
					Subject: {
						Charset: "UTF-8",
						Data: subject
					},
					Body: {
						Html: {
							Charset: "UTF-8",
							Data: message
						}
					}
				},
				Source: sourceEmail,
				Destination: { ToAddresses: receivers }
			}));
		},
	};
}