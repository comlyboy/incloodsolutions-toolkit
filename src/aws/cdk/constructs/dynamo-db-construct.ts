import { Construct } from 'constructs';
import { BillingMode, GlobalSecondaryIndexProps, ITable, LocalSecondaryIndexProps, Table, TableProps } from 'aws-cdk-lib/aws-dynamodb';

import { IBaseCdkConstructProps, IBaseConstruct } from '../../../interface';
import { logDebugger } from '../../../utility';
import { CfnOutput } from 'aws-cdk-lib';

/**
 * Properties for configuring the BaseDynamoDBConstruct.
 */
interface IDynamoDBConstructProps extends Omit<IBaseCdkConstructProps<{
	tableOptions?: TableProps;
	fromExistingTableArn?: string;
	fromExistingTableName?: string;
	localSecondaryIndexes?: LocalSecondaryIndexProps[];
	globalSecondaryIndexes?: GlobalSecondaryIndexProps[];
}>, 'appName' | 'stackName'> { }

/**
 * A reusable CDK construct that manages the creation or import of a DynamoDB table,
 * including optional GSI and LSI indexes.
 */
export class BaseDynamoDBConstruct extends Construct implements IBaseConstruct {
	/** The newly created DynamoDB table (if applicable). */
	readonly table: Table;

	/** The existing table imported by ARN or name (if applicable). */
	readonly existingTable: ITable;

	/** Enable debug logging. */
	enableDebug = false;

	/**
	 * Creates a new instance of the BaseDynamoDBConstruct.
	 *
	 * @param scope - The scope in which this construct is defined.
	 * @param id - The ID of the construct.
	 * @param props - The configuration properties.
	 */
	constructor(scope: Construct, id: string, props: IDynamoDBConstructProps) {
		super(scope, id);

		this.enableDebug = props?.enableDebug;



		// Import table from name
		if (props.options?.fromExistingTableName) {
			this.existingTable = Table.fromTableName(this, `${id}-refName`, props.options.fromExistingTableName) as Table;
			if (this.enableDebug) {
				logDebugger(BaseDynamoDBConstruct.name, `Created Dynamo-DB table from existing using name ${props.options?.fromExistingTableName}`);
			}
			this.table = null;
		} else if (props.options?.fromExistingTableArn) {
			this.existingTable = Table.fromTableArn(this, `${id}-refArn`, props.options.fromExistingTableArn);
			if (this.enableDebug) {
				logDebugger(BaseDynamoDBConstruct.name, `Created Dynamo-DB table from existing using ARN`);
			}
			this.table = null;
		} else {
			this.existingTable = null;

			// Create new table
			this.table = new Table(this, id, {
				...props.options?.tableOptions,
				billingMode: props.options?.tableOptions?.billingMode || BillingMode.PAY_PER_REQUEST,
				deletionProtection:
					(props.options?.tableOptions?.deletionProtection === true || props.options?.tableOptions?.deletionProtection === false)
						? props.options.tableOptions.deletionProtection
						: props.stage === 'production',
			});

			// Add Global Secondary Indexes
			if (props.options?.globalSecondaryIndexes?.length) {
				props.options.globalSecondaryIndexes.forEach(globalIndex => {
					this.table.addGlobalSecondaryIndex(globalIndex);
					if (this.enableDebug) {
						logDebugger(BaseDynamoDBConstruct.name, `Added GSI: ${globalIndex.indexName}`);
					}
				});
			}

			// Add Local Secondary Indexes
			if (props.options?.localSecondaryIndexes?.length) {
				props.options.localSecondaryIndexes.forEach(localIndex => {
					this.table.addLocalSecondaryIndex(localIndex);
					if (this.enableDebug) {
						logDebugger(BaseDynamoDBConstruct.name, `Added LSI: ${localIndex.indexName}`);
					}
				});
			}
		}

		new CfnOutput(this, 'DynamoDbArn', {
			value: props.options?.fromExistingTableName || props.options?.fromExistingTableArn ? this.existingTable.tableArn : this.table.tableArn
		});
	}
}
