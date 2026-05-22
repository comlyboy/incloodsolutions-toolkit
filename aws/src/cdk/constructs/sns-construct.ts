import { Construct } from 'constructs';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Topic, TopicProps } from 'aws-cdk-lib/aws-sns';

import { IBaseCdkConstructProps } from '../../../interface';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';

/**
 * Props for BaseSnsConstruct
 *
 * Provides configuration for:
 * - SNS topic creation
 * - Lambda subscriptions
 */
interface ISnsConstructProps extends Omit<IBaseCdkConstructProps<{
	/** SNS topic configuration options */
	readonly topicOptions: TopicProps;

	/**
	 * Lambda functions to subscribe to the topic
	 *
	 * Each function will receive messages published to the topic
	 */
	readonly targetFunctions: Function[];
}>, 'appName' | 'stage' | 'stackName'> { }

/**
 * CDK construct for SNS topic with Lambda subscriptions
 *
 * Responsibilities:
 * - Creates an SNS topic with configurable options
 * - Subscribes one or more Lambda functions to the topic
 * - Applies a removal policy
 * - Exposes the topic ARN as a CloudFormation output
 */
export class BaseSnsConstruct extends Construct {
	/** The created SNS topic instance */
	readonly topic: Topic;

	/**
	 * @param scope Parent construct
	 * @param id Unique construct identifier
	 * @param props Configuration for topic and subscriptions
	 */
	constructor(scope: Construct, id: string, props: ISnsConstructProps) {
		super(scope, id);

		this.topic = new Topic(this, id, props.options?.topicOptions);

		/**
		 * Attach Lambda subscriptions to the topic
		 */
		if (props.options?.targetFunctions?.length) {
			props.options.targetFunctions.forEach((targetFunction) => {
				this.topic.addSubscription(
					/**
					 * Lambda subscription target
					 */
					new LambdaSubscription(targetFunction)
				);
			});
		}

		/**
		 * Apply removal policy (useful for non-production environments)
		 */
		this.topic.applyRemovalPolicy(RemovalPolicy.DESTROY);

		/**
		 * CloudFormation output exposing the topic ARN
		 */
		new CfnOutput(this, 'SnsTopicArn', {
			value: this.topic.topicArn,
		});
	}
}