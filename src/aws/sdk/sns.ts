import { PublishCommand, SNSClient, SNSClientConfig } from "@aws-sdk/client-sns";

export function initSnsClientWrapper({ config }: { config: SNSClientConfig; }) {
	const snsInstance = new SNSClient(config);

	return {
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