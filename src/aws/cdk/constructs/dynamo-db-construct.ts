import { Construct } from 'constructs';
import { BillingMode, GlobalSecondaryIndexProps, ITable, LocalSecondaryIndexProps, Table, TableProps } from 'aws-cdk-lib/aws-dynamodb';

import { IBaseCdkConstructProps, IBaseConstruct } from '../../../interface';
import { logDebugger } from '../../../utility';

interface IDynamoDBConstructProps extends Omit<IBaseCdkConstructProps<{
	tableOptions?: TableProps;
	fromExistingTableArn?: string;
	fromExistingTableName?: string;
	globalSecondaryIndexes?: GlobalSecondaryIndexProps[];
	localSecondaryIndexes?: LocalSecondaryIndexProps[];
}>, 'appName' | 'stackName'> { }

export class DynamoDBConstruct extends Construct implements IBaseConstruct {
	readonly table: Table;
	readonly existingTable: ITable;

	isDebugMode = false;

	constructor(scope: Construct, id: string, props: IDynamoDBConstructProps) {
		super(scope, id);

		this.isDebugMode = props?.enableDebugMode;

		if (props.options?.fromExistingTableArn) {
			this.existingTable = Table.fromTableArn(this, `${id}-refArn`, props.options?.fromExistingTableArn);
			if (this.isDebugMode) {
				logDebugger(DynamoDBConstruct.name, `Created Dynamo-DB table form existing using ARN`);
			}
			this.table = null;
			return;
		}

		if (props.options?.fromExistingTableName) {
			this.existingTable = Table.fromTableName(this, `${id}-refName`, props.options?.fromExistingTableName) as Table;
			if (this.isDebugMode) {
				logDebugger(DynamoDBConstruct.name, `Created Dynamo-DB table form existing using name ${props.options?.fromExistingTableName}`);
			}
			this.table = null;
			return;
		}

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