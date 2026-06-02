import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import { Architecture, Code, ILayerVersion, LayerVersion, LayerVersionProps, Runtime } from 'aws-cdk-lib/aws-lambda';

import { IBaseCdkConstructProps } from '../../types';

/**
 * Props for BaseLambdaLayerConstruct
 *
 * Provides configuration for:
 * - Creating a new Lambda Layer
 * - Importing an existing layer by ARN or attributes
 */
interface ILambdaLayerConstructProps extends Omit<IBaseCdkConstructProps<{
	/**
	 * Configuration for creating a new Lambda layer
	 *
	 * Note:
	 * - `layerVersionName` is required
	 * - `compatibleArchitectures` is managed internally
	 */
	readonly layerOptions?: Partial<Omit<LayerVersionProps, 'layerVersionName' | 'compatibleArchitectures'>>
	& Required<Pick<LayerVersionProps, 'layerVersionName'>>;

	/** Import an existing layer by ARN */
	readonly fromExistingLayerArn?: string;

	/** Import an existing layer using attributes */
	readonly fromExistingLayerAttribute?: {
		readonly layerVersionArn: string;
		readonly compatibleRuntimes?: Runtime[];
	};
}>, 'appName' | 'stage' | 'stackName'> { }

/**
 * CDK construct for Lambda Layer
 *
 * Responsibilities:
 * - Creates a new Lambda layer or imports an existing one
 * - Applies default runtime and architecture compatibility
 * - Exposes the layer ARN as a CloudFormation output
 */
export class BaseLambdaLayerConstruct extends Construct {
	/** Newly created Lambda Layer (null if importing existing layer) */
	readonly layer: LayerVersion;

	/** Imported Lambda Layer reference (null if creating new layer) */
	readonly existingLayer: ILayerVersion;

	/**
	 * @param scope Parent construct
	 * @param id Unique construct identifier
	 * @param props Configuration for layer creation or import
	 */
	constructor(scope: Construct, id: string, props?: ILambdaLayerConstructProps) {
		super(scope, id);

		/**
		 * Import layer by ARN
		 */
		if (props?.options?.fromExistingLayerArn) {
			this.existingLayer = LayerVersion.fromLayerVersionArn(
				this,
				`${id}-Arn`,
				props?.options?.fromExistingLayerArn
			);

			/**
			 * Import layer using attributes
			 */
		} else if (props?.options?.fromExistingLayerAttribute) {
			this.existingLayer = LayerVersion.fromLayerVersionAttributes(
				this,
				`${id}-Attribute`,
				props?.options?.fromExistingLayerAttribute
			);

			/**
			 * Create new Lambda layer
			 */
		} else {
			this.layer = new LayerVersion(this, id, {
				...props.options?.layerOptions,

				/**
				 * Default layer code asset
				 */
				code:
					props?.options?.layerOptions?.code
					|| Code.fromAsset('./dist-layer'),

				/**
				 * Layer description
				 */
				description:
					props?.options?.layerOptions?.description
					|| 'Lambda Layer written in NodeJS, NestJS, NodeJS-express, serverless-express',

				/**
				 * Supported CPU architectures
				 */
				compatibleArchitectures: [
					Architecture.ARM_64,
					Architecture.X86_64
				],

				/**
				 * Supported runtimes
				 */
				compatibleRuntimes: [
					Runtime.NODEJS_22_X,
					Runtime.NODEJS_24_X,
					Runtime.NODEJS_LATEST
				]
			} as LayerVersionProps);
		}

		/**
		 * CloudFormation output exposing the layer ARN
		 * Resolves to either created or imported layer
		 */
		new CfnOutput(this, 'LambdaLayerArn', {
			value:
				(props.options?.fromExistingLayerArn || props.options?.fromExistingLayerAttribute)
					? this.existingLayer.layerVersionArn
					: this.layer.layerVersionArn
		});
	}
}