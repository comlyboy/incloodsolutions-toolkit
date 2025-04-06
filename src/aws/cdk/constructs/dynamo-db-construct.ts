import { Construct } from 'constructs';
import { BillingMode, GlobalSecondaryIndexProps, LocalSecondaryIndexProps, Table, TableProps } from 'aws-cdk-lib/aws-dynamodb';

import { IBaseCdkConstructProps } from 'src/interface';

interface IDynamoDBConstructProps extends Omit<IBaseCdkConstructProps<{
	tableOptions?: TableProps;
	globalSecondaryIndexes?: GlobalSecondaryIndexProps[];
	localSecondaryIndexes?: LocalSecondaryIndexProps[];
}>, 'appName' | 'stackName'> { }

export class DynamoDBConstruct extends Construct {
	readonly table: Table;

	constructor(scope: Construct, id: string, props: IDynamoDBConstructProps) {
		super(scope, id);
		this.table = new Table(this, id, {
			...props.options?.tableOptions,
			billingMode: props.options?.tableOptions?.billingMode || BillingMode.PAY_PER_REQUEST,
			deletionProtection: (props.options?.tableOptions?.deletionProtection === false || props.options?.tableOptions?.deletionProtection === true) ? props.options?.tableOptions?.deletionProtection : props.stage === 'production',
		});

		if (props?.options?.globalSecondaryIndexes?.length) {
			props.options.globalSecondaryIndexes.map(globalIndex => {
				this.table.addGlobalSecondaryIndex(globalIndex);
			});
		}

		if (props?.options?.localSecondaryIndexes?.length) {
			props.options.localSecondaryIndexes.map(localIndex => {
				this.table.addLocalSecondaryIndex(localIndex);
			});
		}
	}
}