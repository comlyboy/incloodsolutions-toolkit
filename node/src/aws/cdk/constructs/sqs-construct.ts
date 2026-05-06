import { Construct } from 'constructs';
import { EventSourceMapping, EventSourceMappingProps, Function } from 'aws-cdk-lib/aws-lambda';
import { Queue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';

import { IBaseCdkConstructProps } from '../../../interface';

/**
 * Props for BaseSqsConstruct
 *
 * Provides configuration for:
 * - SQS queue creation
 * - Lambda event source mappings
 */
interface ISqsConstructProps extends Omit<IBaseCdkConstructProps<{
	/** Configuration options for the SQS queue */
	readonly queueOptions?: QueueProps;

	/**
	 * Configuration for Lambda event source mapping
	 *
	 * Note:
	 * `eventSourceArn` and `target` are managed internally
	 */
	readonly eventSourceMappingOptions?: Omit<EventSourceMappingProps, 'eventSourceArn' | 'target'>;
}>, 'appName' | 'stage' | 'stackName'> {
	/**
	 * Lambda functions to be triggered by SQS messages
	 *
	 * Each function will be connected via an event source mapping
	 */
	readonly targetFunctions?: Function[];
}

/**
 * CDK construct for SQS queue with Lambda integration
 *
 * Responsibilities:
 * - Creates an SQS queue with configurable options
 * - Attaches one or more Lambda consumers via event source mappings
 * - Applies default retry behaviour
 * - Exposes the queue ARN as a CloudFormation output
 */
export class BaseSqsConstruct extends Construct {
	/** The created SQS queue instance */
	readonly queue: Queue;

	/**
	 * @param scope Parent construct
	 * @param id Unique construct identifier
	 * @param props Configuration for queue and Lambda consumers
	 */
	constructor(scope: Construct, id: string, props: ISqsConstructProps) {
		super(scope, id);

		this.queue = new Queue(this, id, {
			...props?.options?.queueOptions,

			/**
			 * Removal policy applied to the queue
			 * Defaults to DESTROY if not explicitly defined
			 */
			removalPolicy:
				props?.options?.queueOptions?.removalPolicy
				|| RemovalPolicy.DESTROY
		});

		/**
		 * Attach Lambda event source mappings for queue consumption
		 */
		if (props?.targetFunctions?.length) {
			props.targetFunctions.forEach((targetFunction, index) => {
				new EventSourceMapping(this, `${id}-eventSourceMap${index + 1}`, {
					...props?.options?.eventSourceMappingOptions,

					/** Target Lambda function */
					target: targetFunction,

					/** Source SQS queue ARN */
					eventSourceArn: this.queue.queueArn,

					/**
					 * Retry attempts for failed batch processing
					 * Defaults to 3 if not explicitly defined
					 */
					retryAttempts:
						props?.options?.eventSourceMappingOptions?.retryAttempts
						|| 3
				});
			});
		}

		/**
		 * CloudFormation output exposing the SQS queue ARN
		 */
		new CfnOutput(this, 'SqsQueueArn', {
			value: this.queue.queueArn
		});
	}
}