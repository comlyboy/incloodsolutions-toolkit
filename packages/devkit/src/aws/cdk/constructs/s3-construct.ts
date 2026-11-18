import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import {
	Bucket,
	BucketAttributes,
	BucketProps,
	IBucket,
} from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

import { IBaseCdkConstructProps } from '../../types';

/**
 * Props for BaseS3Construct
 *
 * Provides configuration for:
 * - Creating a new S3 bucket
 * - Importing an existing bucket (by name, ARN, or attributes)
 */
export interface IBucketCdkConstructProps {
	/** Configuration options for the S3 bucket */
	readonly bucketOptions?: BucketProps;

	/** Import an existing bucket by ARN */
	readonly fromExistingBucketArn?: string;

	/**Import an existing bucket by name */
	readonly fromExistingBucketName?: string;

	/** Import an existing layer using attributes */
	readonly fromExistingBucketAttribute?: BucketAttributes;
}

/**
 * Props for BaseS3Construct
 *
 * Provides configuration for creating an S3 bucket
 * with optional overrides for bucket properties.
 */
interface IS3ConstructProps extends Omit<
	IBaseCdkConstructProps<IBucketCdkConstructProps>,
	'appName' | 'stackName'
> {}

/**
 * CDK construct for S3 bucket
 *
 * Responsibilities:
 * - Creates an S3 bucket with configurable options
 * - Applies a default removal policy if not provided
 * - Exposes the bucket ARN as a CloudFormation output
 */
export class BaseS3Construct extends Construct {
	/** The created S3 bucket instance */
	readonly bucket: Bucket;
	/** Reference to an existing S3 bucket (if imported) */
	readonly existingBucket: IBucket;

	/**
	 * @param scope Parent construct
	 * @param id Unique construct identifier
	 * @param props Configuration for S3 bucket
	 */
	constructor(scope: Construct, id: string, props: IS3ConstructProps) {
		super(scope, id);

		if (props.options?.fromExistingBucketName) {
			this.existingBucket = Bucket.fromBucketName(
				this,
				`${id}-Name`,
				props.options.fromExistingBucketName,
			);
		} else if (props.options?.fromExistingBucketArn) {
			this.existingBucket = Bucket.fromBucketArn(
				this,
				`${id}-Arn`,
				props.options.fromExistingBucketArn,
			);
		} else if (props.options?.fromExistingBucketAttribute) {
			this.existingBucket = Bucket.fromBucketAttributes(
				this,
				`${id}-Attribute`,
				props.options.fromExistingBucketAttribute,
			);
		} else {
			// If no existing bucket is provided, create a new one
			this.bucket = new Bucket(this, 'Default', {
				...props.options?.bucketOptions,

				/**
				 * Removal policy applied to the bucket
				 * Defaults to DESTROY if not explicitly defined
				 */
				removalPolicy:
					props.options?.bucketOptions?.removalPolicy || RemovalPolicy.DESTROY,
			});
		}

		/**
		 * CloudFormation output exposing the S3 bucket ARN
		 */
		new CfnOutput(this, 'S3BucketArn', {
			value: this.bucket.bucketArn,
		});
	}
}
