import { Construct } from 'constructs';
import { BillingMode, GlobalSecondaryIndexProps, LocalSecondaryIndexProps, Table, TableProps } from 'aws-cdk-lib/aws-dynamodb';

import { IBaseCdkConstructProps, IBaseConstruct } from 'src/interface';
import { logDebugger } from 'src/aws/helper';

interface IDynamoDBConstructProps extends Omit<IBaseCdkConstructProps<{
	tableOptions?: TableProps;
	globalSecondaryIndexes?: GlobalSecondaryIndexProps[];
	localSecondaryIndexes?: LocalSecondaryIndexProps[];
}>, 'appName' | 'stackName'> { }

export class DynamoDBConstruct extends Construct implements IBaseConstruct {
	readonly table: Table;

	isDebugMode = false;

	constructor(scope: Construct, id: string, props: IDynamoDBConstructProps) {
		super(scope, id);

		this.isDebugMode = props?.enableDebugMode;

		this.table = new Table(this, id, {
			...props.options?.tableOptions,
			billingMode: props.options?.tableOptions?.billingMode || BillingMode.PAY_PER_REQUEST,
			deletionProtection: (props.options?.tableOptions?.deletionProtection === false || props.options?.tableOptions?.deletionProtection === true) ? props.options?.tableOptions?.deletionProtection : props.stage === 'production',
		});

		if (props?.options?.globalSecondaryIndexes?.length) {
			props.options.globalSecondaryIndexes.forEach(globalIndex => {
				this.table.addGlobalSecondaryIndex(globalIndex);
				if (this.isDebugMode) {
					logDebugger(DynamoDBConstruct.name, `Added LSI: ${globalIndex.indexName}`);
				}
			});
		}

		if (props?.options?.localSecondaryIndexes?.length) {
			props.options.localSecondaryIndexes.forEach(localIndex => {
				this.table.addLocalSecondaryIndex(localIndex);
				if (this.isDebugMode) {
					logDebugger(DynamoDBConstruct.name, `Added LSI: ${localIndex.indexName}`);
				}
			});
		}
	}
}