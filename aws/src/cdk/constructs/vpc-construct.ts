import { Construct } from 'constructs';
import { Vpc, VpcProps } from 'aws-cdk-lib/aws-ec2';

import { IBaseCdkConstructProps } from '../../../interface';
import { CfnOutput } from 'aws-cdk-lib';

/**
 * Props for BaseVpcConstruct
 *
 * Provides configuration for creating a VPC.
 */
interface ISnsConstructProps extends Omit<IBaseCdkConstructProps<{
	/** VPC configuration options */
	readonly vpcOptions: VpcProps;
}>, 'appName' | 'stage' | 'stackName'> { }

/**
 * CDK construct for Virtual Private Cloud (VPC)
 *
 * Responsibilities:
 * - Creates a VPC with configurable options
 * - Exposes the VPC ARN as a CloudFormation output
 */
export class BaseVpcConstruct extends Construct {
	/** The created VPC instance */
	readonly vpc: Vpc;

	/**
	 * @param scope Parent construct
	 * @param id Unique construct identifier
	 * @param props Configuration for VPC
	 */
	constructor(scope: Construct, id: string, props: ISnsConstructProps) {
		super(scope, id);

		this.vpc = new Vpc(this, id, {
			...props.options.vpcOptions
		});

		/**
		 * CloudFormation output exposing the VPC ARN
		 */
		new CfnOutput(this, 'VpcArn', {
			value: this.vpc.vpcArn
		});
	}
}