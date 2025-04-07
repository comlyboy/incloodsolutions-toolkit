import { Construct } from 'constructs';
import { EventSourceMapping, EventSourceMappingProps, Function } from 'aws-cdk-lib/aws-lambda';
import { Queue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { RemovalPolicy } from 'aws-cdk-lib';

import { IBaseCdkConstructProps } from '../../../interface';

interface ISqsConstructProps extends Omit<IBaseCdkConstructProps<{
	readonly queueOptions?: QueueProps;
	readonly eventSourceMappingOptions?: Omit<EventSourceMappingProps, 'eventSourceArn' | 'target'>;
}>, 'appName' | 'stage' | 'stackName'> {
	readonly receivingFunctions?: Function[];
}

export class SqsConstruct extends Construct {
	readonly queue: Queue;

	constructor(scope: Construct, id: string, props: ISqsConstructProps) {
		super(scope, id);
		this.queue = new Queue(this, id, {
			...props?.options?.queueOptions,
			removalPolicy: props?.options?.queueOptions?.removalPolicy || RemovalPolicy.DESTROY
		});

		if (props?.receivingFunctions?.length) {
			props.receivingFunctions.map((receivingFunction, index) => {
				new EventSourceMapping(this, `eventSourceMap${index + 1}`, {
					...props?.options?.eventSourceMappingOptions,
					target: receivingFunction,
					eventSourceArn: this.queue.queueArn,
					retryAttempts: props?.options?.eventSourceMappingOptions?.retryAttempts || 3
				});
			});
		}
	}
}
