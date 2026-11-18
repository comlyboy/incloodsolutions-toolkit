import { Construct } from 'constructs';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { LogGroup, LogGroupProps, RetentionDays } from 'aws-cdk-lib/aws-logs';

import { IBaseCdkConstructProps } from '../../types';

/**
 * Props for BaseCloudwatchLogGroupConstruct
 *
 * Provides configuration for creating a CloudWatch Log Group
 * with optional overrides for retention and removal policy.
 */
interface ILogGroupConstructProps extends Omit<
	IBaseCdkConstructProps<{
		/** Log Group configuration options */
		readonly logGroupOptions: LogGroupProps;
	}>,
	'appName' | 'stage' | 'stackName'
> {}

/**
 * CDK construct for CloudWatch Log Group
 *
 * Responsibilities:
 * - Creates a log group with configurable options
 * - Applies default removal policy and retention if not provided
 * - Exposes the log group ARN as a CloudFormation output
 */
export class BaseCloudwatchLogGroupConstruct extends Construct {
	/** The created CloudWatch Log Group instance */
	readonly logGroup: LogGroup;

	/**
	 * @param scope Parent construct
	 * @param id Unique construct identifier
	 * @param props Configuration for the log group
	 */
	constructor(scope: Construct, id: string, props: ILogGroupConstructProps) {
		super(scope, id);

		// Id 'Default' is left out of CDK's path when it builds the CloudFormation logical id, so the log
		// group keeps the id it had before this wrapper existed (`<scope>/<id>/Resource`). A different id
		// here renames the logical id, and CloudFormation then creates the new log group before deleting
		// the old one -- failing with "already exists" on a fixed-name group.
		this.logGroup = new LogGroup(this, 'Default', {
			...props.options?.logGroupOptions,

			/**
			 * Removal policy applied to the log group
			 * Defaults to DESTROY when not explicitly defined
			 */
			removalPolicy:
				props?.options?.logGroupOptions?.removalPolicy || RemovalPolicy.DESTROY,

			/**
			 * Log retention period
			 * Defaults to ONE_WEEK when not explicitly defined
			 */
			retention:
				props?.options?.logGroupOptions?.retention || RetentionDays.ONE_WEEK,
		});

		/**
		 * CloudFormation output exposing the Log Group ARN
		 */
		new CfnOutput(this, 'CloudwatchArn', {
			value: this.logGroup.logGroupArn,
		});
	}
}
