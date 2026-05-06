import { Construct } from 'constructs';
import { Bucket, BucketProps } from 'aws-cdk-lib/aws-s3';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BehaviorOptions, Distribution, DistributionProps } from 'aws-cdk-lib/aws-cloudfront';
import { BucketDeployment, BucketDeploymentProps } from 'aws-cdk-lib/aws-s3-deployment';

import { ObjectType, CustomException } from '@incloodsolutions/toolkit';

import { BaseS3Construct } from './s3-construct';
import { BaseCloudfrontConstruct } from './cloudfront-construct';

import { IBaseCdkConstructProps } from '../../../interface';

/**
 * Props for BaseS3DeploymentConstruct
 *
 * Provides configuration for:
 * - Optional S3 bucket creation
 * - Optional CloudFront distribution
 * - S3 bucket deployment
 */
interface IS3DeploymentConstructProps extends Omit<IBaseCdkConstructProps<{
	/** Configuration options for S3 bucket */
	readonly bucketOptions?: BucketProps;

	/**
	 * Configuration options for CloudFront distribution
	 *
	 * Note:
	 * - `additionalBehaviors` supports dynamic route mappings
	 * - Origins are automatically resolved if not provided
	 */
	readonly cloudfrontOptions?: Partial<Omit<DistributionProps, 'additionalBehaviors'>> & {
		readonly additionalBehaviors?: ObjectType<Partial<BehaviorOptions>, string>;
	};

	/**
	 * Configuration for S3 bucket deployment
	 *
	 * Note:
	 * - `sources` is required
	 * - `destinationBucket` can be auto-resolved
	 */
	readonly bucketDeploymentOptions: Omit<Partial<BucketDeploymentProps>, 'sources'> & Pick<BucketDeploymentProps, 'sources'>;
}>, 'appName' | 'stackName'> {
	/** Whether to create a new S3 bucket */
	readonly withS3Bucket?: boolean;

	/** Whether to create a CloudFront distribution */
	readonly withCloudfront?: boolean;
}

/**
 * CDK construct for S3 deployment with optional CloudFront integration
 *
 * Responsibilities:
 * - Optionally creates an S3 bucket
 * - Optionally creates a CloudFront distribution with S3 origin
 * - Deploys assets to S3 bucket
 * - Configures CloudFront invalidation paths
 *
 * Behaviour:
 * - Automatically links S3 bucket as CloudFront origin when enabled
 * - Resolves destination bucket and distribution if not explicitly provided
 * - Throws when required dependencies are missing
 */
export class BaseS3DeploymentConstruct extends Construct {
	/** The created or provided S3 bucket */
	readonly bucket: Bucket;

	/** The created CloudFront distribution */
	readonly distribution: Distribution;

	/** S3 bucket deployment instance */
	readonly bucketDeployment: BucketDeployment;

	/**
	 * @param scope Parent construct
	 * @param id Unique construct identifier
	 * @param props Configuration for bucket, distribution, and deployment
	 */
	constructor(scope: Construct, id: string, props: IS3DeploymentConstructProps) {
		super(scope, id);

		/**
		 * Validate CloudFront origin requirements
		 */
		if ((!props.options?.cloudfrontOptions?.defaultBehavior?.origin && !props?.withS3Bucket) && props.withCloudfront) {
			throw new CustomException('Cloudfront distribution S3_Bucket origins must be defined!');
		}

		/**
		 * Validate deployment destination requirements
		 */
		if (!props.options?.bucketDeploymentOptions?.destinationBucket && !props?.withS3Bucket) {
			throw new CustomException('Deployment S3_Bucket destination must be defined!');
		}

		/**
		 * Create S3 bucket if enabled
		 */
		if (props?.withS3Bucket) {
			this.bucket = new BaseS3Construct(this, 'bucket', {
				enableDebug: props.enableDebug,
				options: { bucketOptions: props.options?.bucketOptions }
			}).bucket;
		}

		/**
		 * Create CloudFront distribution if enabled
		 */
		if (props?.withCloudfront) {

			/**
			 * Resolve S3 origin for distribution
			 */
			const s3Origin =
				props.options?.cloudfrontOptions?.defaultBehavior?.origin
				|| S3BucketOrigin.withOriginAccessControl(this.bucket);

			this.distribution = new BaseCloudfrontConstruct(this, 'distribution', {
				enableDebug: props.enableDebug,
				options: {
					cloudfrontOptions: {
						...props.options?.cloudfrontOptions,

						/**
						 * Map additional behaviors and ensure origin is assigned
						 */
						additionalBehaviors: Object.entries(props.options?.cloudfrontOptions?.additionalBehaviors || {})
							.reduce((behavior, [pattern, behaviorOptions]) => {
								behavior[pattern] = {
									...behaviorOptions,
									origin: behaviorOptions.origin || s3Origin
								};
								return behavior;
							}, {} as typeof props.options.cloudfrontOptions.additionalBehaviors) as ObjectType<BehaviorOptions>,

						/**
						 * Default behavior configuration
						 */
						defaultBehavior: {
							...props.options?.cloudfrontOptions?.defaultBehavior,
							origin: s3Origin
						}
					},
				}
			}).distribution;
		}

		/**
		 * Deploy assets to S3 bucket
		 *
		 * Automatically resolves:
		 * - Destination bucket
		 * - CloudFront distribution
		 * - Invalidation paths
		 */
		this.bucketDeployment = new BucketDeployment(this, 'deployment', {
			...props.options?.bucketDeploymentOptions,

			/** Target distribution for cache invalidation */
			distribution:
				props.options?.bucketDeploymentOptions?.distribution
				|| this.distribution,

			/** Paths to invalidate after deployment */
			distributionPaths:
				props.options?.bucketDeploymentOptions?.distributionPaths
				|| ['/*'],

			/** Destination S3 bucket */
			destinationBucket:
				props.options?.bucketDeploymentOptions?.destinationBucket
				|| this.bucket
		} as BucketDeploymentProps);
	}
}