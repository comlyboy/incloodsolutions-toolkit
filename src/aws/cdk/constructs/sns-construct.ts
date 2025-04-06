import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Topic, TopicProps } from 'aws-cdk-lib/aws-sns';

import { IBaseCdkConstructProps } from 'src/interface';

interface ISnsConstructProps extends Omit<IBaseCdkConstructProps<TopicProps>, 'appName' | 'stage' | 'stackName'> { }

export class SnsConstruct extends Construct {
	readonly topic: Topic;

	constructor(scope: Construct, id: string, props: ISnsConstructProps) {
		super(scope, id);
		this.topic = new Topic(this, id, props.options);
		this.topic.applyRemovalPolicy(RemovalPolicy.DESTROY);
	}
}
