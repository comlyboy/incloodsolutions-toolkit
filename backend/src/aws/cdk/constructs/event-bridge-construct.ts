import { Construct } from 'constructs';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Rule, RuleProps } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

import { IBaseCdkConstructProps } from '../../../interface';

interface IEventBridgeConstructProps extends Omit<IBaseCdkConstructProps<{
	readonly targetFunctions: Function[];
	readonly eventBridgeOptions: RuleProps;
}>, 'appName' | 'stage' | 'stackName'> { }

export class BaseEventBridgeConstruct extends Construct {
	readonly eventSchedule: Rule;

	constructor(scope: Construct, id: string, props: IEventBridgeConstructProps) {
		super(scope, id);

		this.eventSchedule = new Rule(this, id, {
			...props.options?.eventBridgeOptions,
			description: props?.options?.eventBridgeOptions?.description || 'An Event-bridge rule'
		});

		if (props.options?.targetFunctions?.length) {
			props.options.targetFunctions.forEach((targetFunction) => {
				this.eventSchedule.addTarget(new LambdaFunction(targetFunction));
			});
		}

		this.eventSchedule.applyRemovalPolicy(RemovalPolicy.DESTROY);

		new CfnOutput(this, 'EventBridgeArn', {
			value: this.eventSchedule.ruleArn
		});

	}
}
