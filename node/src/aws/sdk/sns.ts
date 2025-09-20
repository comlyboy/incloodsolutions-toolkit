import { PublishBatchCommand, PublishBatchCommandInput, PublishCommand, PublishCommandInput, SNSClient, SNSClientConfig } from "@aws-sdk/client-sns";

/**
 * Initialize an Amazon SNS (Simple Notification Service) client wrapper
 * @param config SNS client configuration
 * @returns Object containing methods for SNS operations
 */
export function initSnsClientWrapper({ config }: { config: SNSClientConfig; }) {
	const snsInstance = new SNSClient(config);

	return {
		/**
		 * Sends a message to an SNS topic
		 * @template TMessage Type of the message to send
		 * @param message The message to publish
		 * @param options Additional SNS publish options
		 * @returns Promise resolving when message is sent
		 */
		sendSnsMessage: async <TMessage = any>(message: TMessage, options?: Omit<PublishCommandInput, 'Message' | 'PhoneNumber'>) => {
			await snsInstance.send(new PublishCommand({
				Message: JSON.stringify(message),
				...options
			}));
		},
		/**
		 * Sends an SMS message via SNS
		 * @param message The text message to send
		 * @param phoneNumber The recipient's phone number
		 * @returns Promise resolving when SMS is sent
		 */
		sendSms: async ({ message, phoneNumber }: { message: string; phoneNumber: string; }) => {
			await snsInstance.send(new PublishCommand({
				Message: message,
				PhoneNumber: phoneNumber
			}));
		},
		/**
		 * Sends multiple messages to SNS topics in a single request
		 * @param command The batch publish command input
		 * @returns Promise resolving when all messages are sent
		 */
		sendBatchMessage: async (command: PublishBatchCommandInput) => {
			await snsInstance.send(new PublishBatchCommand(command));
		}
	};
}