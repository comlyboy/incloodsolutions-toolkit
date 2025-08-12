import { ManagedPolicy, PolicyStatement, PolicyStatementProps, Role, RoleProps } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';

import { IBaseCdkConstructProps } from '../../../interface';


interface IDynamoDBConstructProps extends Omit<IBaseCdkConstructProps<{
	readonly roleOptions: RoleProps
}>, 'appName' | 'stage' | 'stackName'> {
	readonly policies?: PolicyStatementProps[];
}

export class BaseRolePolicyConstruct extends Construct {
	readonly role: Role;

	constructor(scope: Construct, id: string, props: IDynamoDBConstructProps) {
		super(scope, id);

		this.role = new Role(this, id, {
			...props.options?.roleOptions,
			managedPolicies: props.options?.roleOptions?.managedPolicies ? props.options?.roleOptions?.managedPolicies : [
				ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
			]
		});

		if (props?.policies?.length) {
			props.policies.forEach((policy) => {
				this.role.addToPolicy(new PolicyStatement(policy));
			});
		}

		this.role.applyRemovalPolicy(RemovalPolicy.DESTROY);

		new CfnOutput(this, 'RolePolicyArn', {
			value: this.role.roleArn
		});
	}
}