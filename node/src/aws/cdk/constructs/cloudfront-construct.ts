import { Construct } from 'constructs';
import { Distribution, DistributionProps, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';

import { IBaseCdkConstructProps } from '../../../interface';
import { Duration } from 'aws-cdk-lib';

interface ICloudfrontConstructProps extends Omit<IBaseCdkConstructProps<{
	readonly cloudfrontOptions: Partial<DistributionProps>;
}>, 'appName' | 'stage' | 'stackName'> { }

export class BaseCloudfrontConstruct extends Construct {
	readonly distribution: Distribution;

	constructor(scope: Construct, id: string, props: ICloudfrontConstructProps) {
		super(scope, id);

		this.distribution = new Distribution(this, id, {
			...props.options?.cloudfrontOptions,
			defaultBehavior: {
				...props.options?.cloudfrontOptions?.defaultBehavior,
				viewerProtocolPolicy: props.options?.cloudfrontOptions?.defaultBehavior?.viewerProtocolPolicy || ViewerProtocolPolicy.REDIRECT_TO_HTTPS
			},
			errorResponses: [
				...props.options?.cloudfrontOptions?.errorResponses || [],
				{
					httpStatus: 400,
					responseHttpStatus: 200,
					responsePagePath: '/index.html',
					ttl: Duration.days(1)
				},
				{
					httpStatus: 403,
					responseHttpStatus: 200,
					responsePagePath: '/index.html',
					ttl: Duration.days(1)
				},
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
