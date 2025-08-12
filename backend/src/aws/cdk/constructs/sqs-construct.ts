import { Construct } from 'constructs';
import { EventSourceMapping, EventSourceMappingProps, Function } from 'aws-cdk-lib/aws-lambda';
import { Queue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';

import { IBaseCdkConstructProps } from '../../../interface';

interface ISqsConstructProps extends Omit<IBaseCdkConstructProps<{
	readonly queueOptions?: QueueProps;
	readonly eventSourceMappingOptions?: Omit<EventSourceMappingProps, 'eventSourceArn' | 'target'>;
}>, 'appName' | 'stage' | 'stackName'> {
	readonly targetFunctions?: Function[];
}

export class BaseSqsConstruct extends Construct {
	readonly queue: Queue;

	constructor(scope: Construct, id: string, props: ISqsConstructProps) {
		super(scope, id);

		this.queue = new Queue(this, id, {
			...props?.options?.queueOptions,
			removalPolicy: props?.options?.queueOptions?.removalPolicy || RemovalPolicy.DESTROY
		});

		if (props?.targetFunctions?.length) {
			props.targetFunctions.forEach((targetFunction, index) => {
				new EventSourceMapping(this, `${id}-eventSourceMap${index + 1}`, {
					...props?.options?.eventSourceMappingOptions,
					target: targetFunction,
					eventSourceArn: this.queue.queueArn,
					retryAttempts: props?.options?.eventSourceMappingOptions?.retryAttempts || 3
				});
			});
		}

		new CfnOutput(this, 'SqsQueueArn', {
			value: this.queue.queueArn
		});
	}
}
