import { Construct } from 'constructs';
import { Vpc, VpcProps } from 'aws-cdk-lib/aws-ec2';

import { IBaseCdkConstructProps } from '../../../interface';
import { CfnOutput } from 'aws-cdk-lib';

interface ISnsConstructProps extends Omit<IBaseCdkConstructProps<{
	readonly vpcOptions: VpcProps;
}>, 'appName' | 'stage' | 'stackName'> { }

export class BaseVpcConstruct extends Construct {
	readonly vpc: Vpc;

	constructor(scope: Construct, id: string, props: ISnsConstructProps) {
		super(scope, id);

		this.vpc = new Vpc(this, id, {
			...props.options.vpcOptions
		});

		new CfnOutput(this, 'VpcArn', {
			value: this.vpc.vpcArn
		});

	}
}
