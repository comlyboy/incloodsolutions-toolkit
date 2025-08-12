import { Construct } from 'constructs';
import { BillingMode, GlobalSecondaryIndexProps, ITable, LocalSecondaryIndexProps, Table, TableAttributes, TableProps } from 'aws-cdk-lib/aws-dynamodb';
import { CfnOutput } from 'aws-cdk-lib';

import { IBaseCdkConstructProps, IBaseConstruct } from '../../../interface';
import { logDebugger } from '../../../utility';

/**
 * Properties for configuring the BaseDynamoDBConstruct.
 */
interface IDynamoDBConstructProps extends Omit<IBaseCdkConstructProps<{
	readonly tableOptions?: TableProps;
	readonly fromExistingTableArn?: string;
	readonly fromExistingTableName?: string;
	readonly fromExistingTableAttributes?: TableAttributes;
	readonly localSecondaryIndexes?: LocalSecondaryIndexProps[];
	readonly globalSecondaryIndexes?: GlobalSecondaryIndexProps[];
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
			this.table = null;
			this.existingTable = Table.fromTableName(this, `${id}-RefName`, props.options.fromExistingTableName);
			if (this.enableDebug) {
				logDebugger(BaseDynamoDBConstruct.name, `Created Dynamo-DB table from existing using name ${props.options?.fromExistingTableName}`);
			}
		} else if (props.options?.fromExistingTableArn) {
			this.table = null;
			this.existingTable = Table.fromTableArn(this, `${id}-RefArn`, props.options.fromExistingTableArn);
			if (this.enableDebug) {
				logDebugger(BaseDynamoDBConstruct.name, `Created Dynamo-DB table from existing using ARN`);
			}
		} else if (props.options?.fromExistingTableAttributes) {
			this.table = null;
			this.existingTable = Table.fromTableAttributes(this, `${id}-RefAttributes`, props.options.fromExistingTableAttributes);
			if (this.enableDebug) {
				logDebugger(BaseDynamoDBConstruct.name, `Created Dynamo-DB table from existing attributes`);
			}
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
