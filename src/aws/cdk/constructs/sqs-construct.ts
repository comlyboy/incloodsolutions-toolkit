import { Construct } from 'constructs';
import { EventSourceMapping, EventSourceMappingProps, Function } from 'aws-cdk-lib/aws-lambda';
import { Queue, QueueProps } from 'aws-cdk-lib/aws-sqs';
import { RemovalPolicy } from 'aws-cdk-lib';

import { IBaseCdkConstructProps } from 'src/interface';

interface ISqsConstructProps extends IBaseCdkConstructProps<{
	readonly queueOptions?: QueueProps;
	readonly eventSourceMappingOptions?: Omit<EventSourceMappingProps, 'eventSourceArn' | 'target'>;
}> {
	readonly receivingFunctions?: Function[];
}

export class SqsConstruct extends Construct {
	readonly queue: Queue;
	constructor(scope: Construct, id: string, props: ISqsConstructProps) {
		super(scope, id);
		this.queue = new Queue(this, id, {
			...props.options?.queueOptions,
			removalPolicy: props?.options?.queueOptions?.removalPolicy || RemovalPolicy.DESTROY
		});

		if (props?.receivingFunctions?.length) {
			props.receivingFunctions.forEach((receivingFunction, index) => {
				new EventSourceMapping(this, `eventSourceMap${index + 1}`, {
					...props?.options?.eventSourceMappingOptions,
					target: receivingFunction,
					eventSourceArn: this.queue.queueArn,
					batchSize: props.options?.eventSourceMappingOptions?.batchSize || 10,
					retryAttempts: props.options?.eventSourceMappingOptions?.retryAttempts || 3
				});
			});
		}
	}
}
