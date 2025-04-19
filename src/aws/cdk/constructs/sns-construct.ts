import { Construct } from 'constructs';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Topic, TopicProps } from 'aws-cdk-lib/aws-sns';

import { IBaseCdkConstructProps } from '../../../interface';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';

interface ISnsConstructProps extends Omit<IBaseCdkConstructProps<{
	readonly targetFunctions: Function[];
	readonly topicOptions: TopicProps;
}>, 'appName' | 'stage' | 'stackName'> { }

export class SnsConstruct extends Construct {
	readonly topic: Topic;

	constructor(scope: Construct, id: string, props: ISnsConstructProps) {
		super(scope, id);
		this.topic = new Topic(this, id, props.options?.topicOptions);

		if (props.options?.targetFunctions?.length) {
			props.options.targetFunctions.forEach((targetFunction) => {
				this.topic.addSubscription(new LambdaSubscription(targetFunction));
			});
		}

		this.topic.applyRemovalPolicy(RemovalPolicy.DESTROY);

		new CfnOutput(this, 'TopicArn', {
			value: this.topic.topicArn,
		});

	}
}
