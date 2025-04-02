import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Rule, RuleProps } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

import { IBaseCdkConstructProps } from 'src/interface';

interface IEventBridgeConstructProps extends IBaseCdkConstructProps<{
	readonly targetFunctions: Function[];
	readonly eventBridgeOptions: RuleProps;
}> { }

export class EventBridgeConstruct extends Construct {
	readonly eventSchedule: Rule;
	constructor(scope: Construct, id: string, props: IEventBridgeConstructProps) {
		super(scope, id);
		this.eventSchedule = new Rule(this, id, {
			...props.options?.eventBridgeOptions
		});

		if (props.options?.targetFunctions?.length) {
			props.options.targetFunctions.forEach((targetFunction) => {
				this.eventSchedule.addTarget(new LambdaFunction(targetFunction));
			});
		}
		this.eventSchedule.applyRemovalPolicy(RemovalPolicy.DESTROY);
	}
}
