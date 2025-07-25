import { Construct } from 'constructs';
import { Bucket, BucketProps } from 'aws-cdk-lib/aws-s3';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Distribution, DistributionProps } from 'aws-cdk-lib/aws-cloudfront';
import { BucketDeployment, BucketDeploymentProps } from 'aws-cdk-lib/aws-s3-deployment';

import { CustomException } from '../../../error';
import { BaseS3Construct } from './s3-construct';
import { IBaseCdkConstructProps } from '../../../interface';
import { BaseCloudfrontConstruct } from './cloudfront-construct';

interface IS3DeploymentConstructProps extends Omit<IBaseCdkConstructProps<{
	readonly bucketOptions?: BucketProps;
	readonly cloudfrontOptions?: Partial<DistributionProps>;
	readonly bucketDeploymentOptions: Omit<Partial<BucketDeploymentProps>, 'sources'> & Pick<BucketDeploymentProps, 'sources'>;
}>, 'appName' | 'stackName'> {
	readonly withS3Bucket?: boolean;
	readonly withCloudfront?: boolean;
}
export class BaseS3DeploymentConstruct extends Construct {
	readonly bucket: Bucket;
	readonly distribution: Distribution;
	readonly bucketDeployment: BucketDeployment;

	constructor(scope: Construct, id: string, props: IS3DeploymentConstructProps) {
		super(scope, id);

		if ((!props.options?.cloudfrontOptions?.defaultBehavior?.origin && !props?.withS3Bucket) && props.withCloudfront) {
			throw new CustomException('Distribution origins must be defined!');
		}

		if (!props.options?.bucketDeploymentOptions?.destinationBucket && !props?.withS3Bucket) {
			throw new CustomException('Deployment S3_Bucket destination must be defined!');
		}

		if (props?.withS3Bucket) {
			this.bucket = new BaseS3Construct(this, 'bucket', {
				enableDebug: props.enableDebug,
				options: { bucketOptions: props.options?.bucketOptions }
			}).bucket;
		}

		if (props?.withCloudfront) {
			this.distribution = new BaseCloudfrontConstruct(this, 'distribution', {
				enableDebug: props.enableDebug,
				options: {
					cloudfrontOptions: {
						...props.options?.cloudfrontOptions,
						defaultBehavior: {
							...props.options?.cloudfrontOptions?.defaultBehavior,
							origin: props.options?.cloudfrontOptions?.defaultBehavior?.origin || S3BucketOrigin.withOriginAccessControl(this.bucket)
						}
					},
				}
			}).distribution;
		}

		this.bucketDeployment = new BucketDeployment(this, 'deployment', {
			...props.options?.bucketDeploymentOptions,
			distribution: props.options?.bucketDeploymentOptions?.distribution || this.distribution,
			distributionPaths: props.options?.bucketDeploymentOptions?.distributionPaths || ['/*'],
			destinationBucket: props.options?.bucketDeploymentOptions?.destinationBucket || this.bucket
		} as BucketDeploymentProps);

	}
}
