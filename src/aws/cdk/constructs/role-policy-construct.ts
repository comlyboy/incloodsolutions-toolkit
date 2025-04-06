import { ManagedPolicy, PolicyStatement, PolicyStatementProps, Role, RoleProps } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';

import { IBaseCdkConstructProps } from 'src/interface';


interface IDynamoDBConstructProps extends Omit<IBaseCdkConstructProps<RoleProps>, 'appName' | 'stage' | 'stackName'> {
	readonly policies?: PolicyStatementProps[];
}

export class RolePolicyConstruct extends Construct {
	readonly role: Role;

	constructor(scope: Construct, id: string, props: IDynamoDBConstructProps) {
		super(scope, id);
		this.role = new Role(this, id, {
			...props.options,
			managedPolicies: [
				ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
			]
		});

		if (props?.policies?.length) {
			props.policies.map((policy) => {
				this.role.addToPolicy(new PolicyStatement(policy));
			});
		}
		this.role.applyRemovalPolicy(RemovalPolicy.DESTROY);
	}
}