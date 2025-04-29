import { PublishBatchCommand, PublishBatchCommandInput, PublishCommand, PublishCommandInput, SNSClient, SNSClientConfig } from "@aws-sdk/client-sns";

export function initSnsClientWrapper({ config }: { config: SNSClientConfig; }) {
	const snsInstance = new SNSClient(config);

	return {
		sendSnsMessage: async <TMessage = any>(message: TMessage, options?: Omit<PublishCommandInput, 'Message' | 'PhoneNumber'>) => {
			await snsInstance.send(new PublishCommand({
				Message: JSON.stringify(message),
				...options
			}));
		},
		sendSms: async ({ message, phoneNumber }: { message: string; phoneNumber: string; }) => {
			await snsInstance.send(new PublishCommand({
				Message: message,
				PhoneNumber: phoneNumber
			}));
		},
		sendBatchMessage: async (command: PublishBatchCommandInput) => {
			await snsInstance.send(new PublishBatchCommand(command));
		}
	};
}