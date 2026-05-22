import { ManagedPolicy, PolicyStatement, PolicyStatementProps, Role, RoleProps } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';

import { IBaseCdkConstructProps } from '../../../interface';

/**
 * Props for BaseRolePolicyConstruct
 *
 * Provides configuration for:
 * - IAM role creation
 * - Inline policy statements
 */
interface IDynamoDBConstructProps extends Omit<IBaseCdkConstructProps<{
	/** IAM Role configuration options */
	readonly roleOptions: RoleProps
}>, 'appName' | 'stage' | 'stackName'> {
	/**
	 * Additional inline policies to attach to the role
	 *
	 * Each entry is converted into a PolicyStatement
	 */
	readonly policies?: PolicyStatementProps[];
}

/**
 * CDK construct for IAM Role with policies
 *
 * Responsibilities:
 * - Creates an IAM role with configurable options
 * - Applies a default AWS managed policy if none is provided
 * - Attaches optional inline policy statements
 * - Exposes the role ARN as a CloudFormation output
 */
export class BaseRolePolicyConstruct extends Construct {
	/** The created IAM Role instance */
	readonly role: Role;

	/**
	 * @param scope Parent construct
	 * @param id Unique construct identifier
	 * @param props Configuration for role and policies
	 */
	constructor(scope: Construct, id: string, props: IDynamoDBConstructProps) {
		super(scope, id);

		this.role = new Role(this, id, {
			...props.options?.roleOptions,

			/**
			 * Managed policies attached to the role
			 * Defaults to AWSLambdaBasicExecutionRole if not provided
			 */
			managedPolicies:
				props.options?.roleOptions?.managedPolicies
					? props.options.roleOptions.managedPolicies
					: [
						ManagedPolicy.fromAwsManagedPolicyName(
							'service-role/AWSLambdaBasicExecutionRole'
						)
					]
		});

		/**
		 * Attach inline policy statements to the role
		 */
		if (props?.policies?.length) {
			props.policies.forEach((policy) => {
				this.role.addToPolicy(
					/**
					 * Inline policy statement
					 */
					new PolicyStatement(policy)
				);
			});
		}

		/**
		 * Apply removal policy (useful for non-production environments)
		 */
		this.role.applyRemovalPolicy(RemovalPolicy.DESTROY);

		/**
		 * CloudFormation output exposing the role ARN
		 */
		new CfnOutput(this, 'RolePolicyArn', {
			value: this.role.roleArn
		});
	}
}