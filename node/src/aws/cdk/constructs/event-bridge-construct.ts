import { Construct } from 'constructs';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Rule, RuleProps } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

import { IBaseCdkConstructProps } from '../../../interface';

/**
 * Props for BaseEventBridgeConstruct
 *
 * Provides configuration for:
 * - EventBridge rule creation
 * - Target Lambda functions
 */
interface IEventBridgeConstructProps extends Omit<IBaseCdkConstructProps<{
	/** Lambda functions to be triggered by the rule */
	readonly targetFunctions: Function[];

	/** EventBridge rule configuration */
	readonly eventBridgeOptions: RuleProps;
}>, 'appName' | 'stage' | 'stackName'> { }

/**
 * CDK construct for EventBridge rule
 *
 * Responsibilities:
 * - Creates an EventBridge rule with configurable options
 * - Attaches one or more Lambda targets
 * - Applies a removal policy
 * - Exposes the rule ARN as a CloudFormation output
 */
export class BaseEventBridgeConstruct extends Construct {
	/** The created EventBridge rule instance */
	readonly eventSchedule: Rule;

	/**
	 * @param scope Parent construct
	 * @param id Unique construct identifier
	 * @param props Configuration for rule and target functions
	 */
	constructor(scope: Construct, id: string, props: IEventBridgeConstructProps) {
		super(scope, id);

		this.eventSchedule = new Rule(this, id, {
			...props.options?.eventBridgeOptions,

			/** Default description if not explicitly provided */
			description:
				props?.options?.eventBridgeOptions?.description
				|| 'An Event-bridge rule'
		});

		/**
		 * Attach Lambda targets to the rule
		 */
		if (props.options?.targetFunctions?.length) {
			props.options.targetFunctions.forEach((targetFunction) => {
				this.eventSchedule.addTarget(
					/**
					 * Lambda target integration
					 */
					new LambdaFunction(targetFunction)
				);
			});
		}

		/**
		 * Apply removal policy (useful for non-production environments)
		 */
		this.eventSchedule.applyRemovalPolicy(RemovalPolicy.DESTROY);

		/**
		 * CloudFormation output exposing the rule ARN
		 */
		new CfnOutput(this, 'EventBridgeArn', {
			value: this.eventSchedule.ruleArn
		});
	}
}