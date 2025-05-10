import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Bucket, BucketProps } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, BucketDeploymentProps } from 'aws-cdk-lib/aws-s3-deployment';

import { AppEnvironmentEnum, IBaseCdkConstructProps } from '../../../interface';

interface IS3DeploymentConstructProps extends Omit<IBaseCdkConstructProps<{
	readonly bucketOptions?: BucketProps;
	readonly bucketDeploymentOptions?: Partial<BucketDeploymentProps>;
}>, 'appName' | 'stackName'> {
	readonly withBucketDeployment?: boolean;
}
export class S3DeploymentConstruct extends Construct {
	readonly bucket: Bucket;
	readonly bucketDeployment: BucketDeployment;

	constructor(scope: Construct, id: string, props: IS3DeploymentConstructProps) {
		super(scope, id);
		this.bucket = new Bucket(this, id, {
			...props.options?.bucketOptions,
			removalPolicy: props.options?.bucketOptions?.removalPolicy || props.stage === AppEnvironmentEnum.PRODUCTION ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY
		});

		if (props?.withBucketDeployment) {
			this.bucketDeployment = new BucketDeployment(this, 'deployment', {
				...props.options?.bucketDeploymentOptions,
				destinationBucket: this.bucket,
			} as BucketDeploymentProps);
		}
	}
}
