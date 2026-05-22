import { Construct } from 'constructs';
import { Distribution, DistributionProps, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';

import { IBaseCdkConstructProps } from '../../../interface';
import { Duration } from 'aws-cdk-lib';

/**
 * Props for BaseCloudfrontConstruct
 *
 * Provides configuration for creating a CloudFront distribution
 * with optional overrides for default behaviour and error handling.
 */
interface ICloudfrontConstructProps extends Omit<IBaseCdkConstructProps<{
	/** Partial configuration for the CloudFront distribution */
	readonly cloudfrontOptions: Partial<DistributionProps>;
}>, 'appName' | 'stage' | 'stackName'> { }

/**
 * CDK construct for CloudFront distribution
 *
 * Responsibilities:
 * - Creates a CloudFront distribution with configurable options
 * - Enforces HTTPS redirection by default
 * - Adds fallback error responses for SPA routing (400, 403, 404 → index.html)
 */
export class BaseCloudfrontConstruct extends Construct {
	/** The created CloudFront distribution instance */
	readonly distribution: Distribution;

	/**
	 * @param scope Parent construct
	 * @param id Unique construct identifier
	 * @param props Configuration for CloudFront distribution
	 */
	constructor(scope: Construct, id: string, props: ICloudfrontConstructProps) {
		super(scope, id);

		this.distribution = new Distribution(this, id, {
			...props.options?.cloudfrontOptions,

			/**
			 * Default behaviour configuration
			 * Enforces HTTPS if not explicitly defined
			 */
			defaultBehavior: {
				...props.options?.cloudfrontOptions?.defaultBehavior,
				viewerProtocolPolicy:
					props.options?.cloudfrontOptions?.defaultBehavior?.viewerProtocolPolicy
					|| ViewerProtocolPolicy.REDIRECT_TO_HTTPS
			},

			/**
			 * Error response configuration
			 *
			 * Adds SPA-friendly fallbacks:
			 * - 400, 403, 404 responses are redirected to index.html
			 */
			errorResponses: [
				...props.options?.cloudfrontOptions?.errorResponses || [],

				/** Handle 400 errors */
				{
					httpStatus: 400,
					responseHttpStatus: 200,
					responsePagePath: '/index.html',
					ttl: Duration.days(1)
				},

				/** Handle 403 errors */
				{
					httpStatus: 403,
					responseHttpStatus: 200,
					responsePagePath: '/index.html',
					ttl: Duration.days(1)
				},

				/** Handle 404 errors */
				{
					httpStatus: 404,
					responseHttpStatus: 200,
					responsePagePath: '/index.html',
					ttl: Duration.days(1)
				},
			],
		});
	}
}