import { Construct } from 'constructs';
import { BillingMode, GlobalSecondaryIndexProps, ITable, LocalSecondaryIndexProps, Table, TableAttributes, TableProps } from 'aws-cdk-lib/aws-dynamodb';
import { CfnOutput } from 'aws-cdk-lib';

import { logDebugger } from '../../../utility';
import { IBaseCdkConstructProps, IBaseConstruct } from '../../../interface';

/**
 * Props for BaseDynamoDBConstruct
 *
 * Provides configuration for:
 * - Creating a new DynamoDB table
 * - Importing an existing table (by name, ARN, or attributes)
 * - Defining Global Secondary Indexes (GSI) and Local Secondary Indexes (LSI)
 */
interface IDynamoDBConstructProps extends Omit<IBaseCdkConstructProps<{
	/** Configuration for creating a new table */
	readonly tableOptions?: TableProps;

	/** Import an existing table by ARN */
	readonly fromExistingTableArn?: string;

	/** Import an existing table by name */
	readonly fromExistingTableName?: string;

	/** Import an existing table using attributes */
	readonly fromExistingTableAttributes?: TableAttributes;

	/** Global Secondary Index definitions */
	readonly globalSecondaryIndexes?: GlobalSecondaryIndexProps[];

	/** Local Secondary Index definitions */
	readonly localSecondaryIndexes?: LocalSecondaryIndexProps[];
}>, 'appName' | 'stackName'> { }

/**
 * CDK construct for DynamoDB table management
 *
 * Responsibilities:
 * - Creates a new DynamoDB table or imports an existing one
 * - Applies default billing mode and deletion protection
 * - Attaches optional GSIs and LSIs
 * - Exposes table ARN as a CloudFormation output
 */
export class BaseDynamoDBConstruct extends Construct implements IBaseConstruct {
	/** Newly created DynamoDB table (null if importing existing table) */
	readonly table: Table;

	/** Imported DynamoDB table reference (null if creating new table) */
	readonly existingTable: ITable;

	/** Enables debug logging */
	enableDebug = false;

	/**
	 * @param scope Parent construct
	 * @param id Unique construct identifier
	 * @param props Configuration for table creation or import
	 */
	constructor(scope: Construct, id: string, props: IDynamoDBConstructProps) {
		super(scope, id);

		this.enableDebug = props?.enableDebug;

		/**
		 * Import table by name
		 */
		if (props.options?.fromExistingTableName) {
			this.table = null;

			this.existingTable = Table.fromTableName(
				this,
				`${id}-RefName`,
				props.options.fromExistingTableName
			);

			if (this.enableDebug) {
				logDebugger(
					BaseDynamoDBConstruct.name,
					`Created Dynamo-DB table from existing using name ${props.options?.fromExistingTableName}`
				);
			}

			/**
			 * Import table by ARN
			 */
		} else if (props.options?.fromExistingTableArn) {
			this.table = null;

			this.existingTable = Table.fromTableArn(
				this,
				`${id}-RefArn`,
				props.options.fromExistingTableArn
			);

			if (this.enableDebug) {
				logDebugger(
					BaseDynamoDBConstruct.name,
					`Created Dynamo-DB table from existing using ARN`
				);
			}

			/**
			 * Import table using attributes
			 */
		} else if (props.options?.fromExistingTableAttributes) {
			this.table = null;

			this.existingTable = Table.fromTableAttributes(
				this,
				`${id}-RefAttributes`,
				props.options.fromExistingTableAttributes
			);

			if (this.enableDebug) {
				logDebugger(
					BaseDynamoDBConstruct.name,
					`Created Dynamo-DB table from existing attributes`
				);
			}

			/**
			 * Create new table
			 */
		} else {
			this.existingTable = null;

			this.table = new Table(this, id, {
				...props.options?.tableOptions,

				/**
				 * Billing mode defaults to PAY_PER_REQUEST if not provided
				 */
				billingMode:
					props.options?.tableOptions?.billingMode
					|| BillingMode.PAY_PER_REQUEST,

				/**
				 * Deletion protection:
				 * - Uses explicit value if provided
				 * - Defaults to true in production stage
				 */
				deletionProtection:
					(props.options?.tableOptions?.deletionProtection === true ||
						props.options?.tableOptions?.deletionProtection === false)
						? props.options.tableOptions.deletionProtection
						: props.stage === 'production',
			});

			/**
			 * Attach Global Secondary Indexes (GSI)
			 */
			if (props.options?.globalSecondaryIndexes?.length) {
				props.options.globalSecondaryIndexes.forEach(globalIndex => {
					this.table.addGlobalSecondaryIndex(globalIndex);

					if (this.enableDebug) {
						logDebugger(
							BaseDynamoDBConstruct.name,
							`Added GSI: ${globalIndex.indexName}`
						);
					}
				});
			}

			/**
			 * Attach Local Secondary Indexes (LSI)
			 */
			if (props.options?.localSecondaryIndexes?.length) {
				props.options.localSecondaryIndexes.forEach(localIndex => {
					this.table.addLocalSecondaryIndex(localIndex);

					if (this.enableDebug) {
						logDebugger(
							BaseDynamoDBConstruct.name,
							`Added LSI: ${localIndex.indexName}`
						);
					}
				});
			}
		}

		/**
		 * CloudFormation output exposing the table ARN
		 * Resolves to either created or imported table
		 */
		new CfnOutput(this, 'DynamoDbArn', {
			value:
				(props.options?.fromExistingTableName || props.options?.fromExistingTableArn)
					? this.existingTable.tableArn
					: this.table.tableArn
		});
	}
}