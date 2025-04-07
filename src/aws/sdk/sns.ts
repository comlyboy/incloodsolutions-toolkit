import { PublishCommand, SNSClient, SNSClientConfig } from "@aws-sdk/client-sns";

export function initSnsClientWrapper({ config }: { config: SNSClientConfig; }) {
	const snsInstance = new SNSClient(config);

	return {
		sendSnsMessage: async <TMessage = any>(message: TMessage) => {
			await snsInstance.send(new PublishCommand({
				Message: typeof message === 'string' ? message : JSON.stringify(message),

			}));
		}
		,
		sendSms: async ({ message, phoneNumber }: { message: string; phoneNumber: string; }) => {
			await snsInstance.send(new PublishCommand({
				Message: message,
				PhoneNumber: phoneNumber
			}));
		},
		sendBatchSms: async ({ message, phoneNumber }: {
			message: string;
			phoneNumber: string;
		}) => {
			await snsInstance.send(new PublishCommand({
				Message: message,
				PhoneNumber: phoneNumber
			}));
		}
	};
}