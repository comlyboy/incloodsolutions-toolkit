import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import { Bucket, BucketProps } from 'aws-cdk-lib/aws-s3';

import { IBaseCdkConstructProps } from '../../../interface';

interface IS3DeploymentConstructProps extends Omit<IBaseCdkConstructProps<{
	readonly bucketOptions?: BucketProps;
}>, 'appName' | 'stackName'> { }
export class BaseS3Construct extends Construct {
	readonly bucket: Bucket;

	constructor(scope: Construct, id: string, props: IS3DeploymentConstructProps) {
		super(scope, id);

		this.bucket = new Bucket(this, id, {
			...props.options?.bucketOptions,
			// removalPolicy: props.options?.bucketOptions?.removalPolicy || props.stage === AppEnvironmentEnum.PRODUCTION ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY
		});

		new CfnOutput(this, 'S3BucketArn', {
			value: this.bucket.bucketArn
		});

	}
}
