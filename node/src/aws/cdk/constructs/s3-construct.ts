import { Construct } from 'constructs';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Bucket, BucketProps } from 'aws-cdk-lib/aws-s3';

import { IBaseCdkConstructProps } from '../../../interface';

/**
 * Props for BaseS3Construct
 *
 * Provides configuration for creating an S3 bucket
 * with optional overrides for bucket properties.
 */
interface IS3DeploymentConstructProps extends Omit<IBaseCdkConstructProps<{
	/** Configuration options for the S3 bucket */
	readonly bucketOptions?: BucketProps;
}>, 'appName' | 'stackName'> { }

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

	/**
	 * @param scope Parent construct
	 * @param id Unique construct identifier
	 * @param props Configuration for S3 bucket
	 */
	constructor(scope: Construct, id: string, props: IS3DeploymentConstructProps) {
		super(scope, id);

		this.bucket = new Bucket(this, id, {
			...props.options?.bucketOptions,

			/**
			 * Removal policy applied to the bucket
			 * Defaults to DESTROY if not explicitly defined
			 */
			removalPolicy:
				props.options?.bucketOptions?.removalPolicy
				|| RemovalPolicy.DESTROY
		});

		/**
		 * CloudFormation output exposing the S3 bucket ARN
		 */
		new CfnOutput(this, 'S3BucketArn', {
			value: this.bucket.bucketArn
		});
	}
}