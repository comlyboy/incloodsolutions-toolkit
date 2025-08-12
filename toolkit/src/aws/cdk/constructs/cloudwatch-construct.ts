import { Construct } from 'constructs';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { LogGroup, LogGroupProps, RetentionDays } from 'aws-cdk-lib/aws-logs';

import { IBaseCdkConstructProps } from '../../../interface';

interface ILogGroupConstructProps extends Omit<IBaseCdkConstructProps<{
	readonly logGroupOptions: LogGroupProps
}>, 'appName' | 'stage' | 'stackName'> { }

export class BaseCloudwatchLogGroupConstruct extends Construct {
	readonly logGroup: LogGroup;

	constructor(scope: Construct, id: string, props: ILogGroupConstructProps) {
		super(scope, id);

		this.logGroup = new LogGroup(this, id, {
			...props.options?.logGroupOptions,
			removalPolicy: props?.options?.logGroupOptions?.removalPolicy || RemovalPolicy.DESTROY,
			retention: props?.options?.logGroupOptions?.retention || RetentionDays.INFINITE,
		});

		new CfnOutput(this, 'CloudwatchArn', {
			value: this.logGroup.logGroupArn
		});

	}
}
