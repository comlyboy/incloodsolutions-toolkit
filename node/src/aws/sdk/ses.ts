import { SendEmailCommand, SESClient, SESClientConfig } from "@aws-sdk/client-ses";

/**
 * Initialize an Amazon SES (Simple Email Service) client wrapper
 * @param sourceEmail The email address to send emails from
 * @param config Optional SES client configuration
 * @returns Object containing methods for email operations
 */
export function initSesClientWrapper({ sourceEmail, config }: {
	sourceEmail: string;
	config?: SESClientConfig;
}) {
	const sesInstance = new SESClient(config);

	return {
		/**
		 * Sends an email using Amazon SES
		 * @param subject The email subject
		 * @param message Object containing email content, type (html/text), and charset
		 * @param receivers Array of recipient email addresses
		 * @returns Promise resolving to the send email response
		 */
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