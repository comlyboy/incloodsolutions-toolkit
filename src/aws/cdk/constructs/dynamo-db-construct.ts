import { Construct } from 'constructs';
import { BillingMode, GlobalSecondaryIndexProps, LocalSecondaryIndexProps, Table, TableProps } from 'aws-cdk-lib/aws-dynamodb';

import { IBaseCdkConstructProps } from 'src/interface';

interface IDynamoDBConstructProps extends IBaseCdkConstructProps<{
	tableOptions?: TableProps;
	globalSecondaryIndexes?: GlobalSecondaryIndexProps[];
	localSecondaryIndexes?: LocalSecondaryIndexProps[];
}> { }

export class DynamoDBConstruct extends Construct {
	readonly table: Table;
	constructor(scope: Construct, id: string, props: IDynamoDBConstructProps) {
		super(scope, id);

		this.table = new Table(this, id, {
			...props.options?.tableOptions,
			billingMode: props.options?.tableOptions?.billingMode || BillingMode.PAY_PER_REQUEST,
			deletionProtection: props.stage === 'production',
			// removalPolicy: props.stage === 'production' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
		});

		if (props?.options?.globalSecondaryIndexes?.length) {
			props.options.globalSecondaryIndexes.forEach((globalIndex) => {
				this.table.addGlobalSecondaryIndex(globalIndex);
			});
		}
		// if (props?.options?.localSecondaryIndexes?.length) {
		// 	props.options.localSecondaryIndexes.forEach((localIndex) => {
		// 		this.table.addLocalSecondaryIndex(localIndex);
		// 	});
		// }
	}
}