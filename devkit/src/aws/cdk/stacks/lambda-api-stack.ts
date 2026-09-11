import { App, Stack } from "aws-cdk-lib";

import { IBaseStackProps } from "../../types";
import { BaseApiGatewayV2Construct, BaseLambdaConstruct, BaseLambdaLayerConstruct } from "../constructs";
import { CustomException } from "@incloodsolutions/toolkit";
import { ILayerVersion } from "aws-cdk-lib/aws-lambda";
import { HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";

export class BaseLambdaApiStack extends Stack {
	constructor(scope: App, id: string, props: IBaseStackProps<{
		layerOptions?: {
			name: string;
			version: number;
		};
		lambdaOptions?: {};
		apiGatewayOptions?: {};
	}>) {
		super(scope, id, props);
		let layers: ILayerVersion[] = [];

		if (props?.stackOptions?.layerOptions) {
			if (!props.stackOptions?.layerOptions?.name || !props.stackOptions?.layerOptions?.version) {
				throw new CustomException("Invalid layer options provided! Both layer 'name' and 'version' are required.");
			}
			const { existingLayer } = new BaseLambdaLayerConstruct(
				this,
				'layer',
				{
					options: {
						fromExistingLayerArn: `arn:aws:lambda:${props.env?.region}:${props.env?.account}:layer:${props.stackOptions?.layerOptions?.name}:${props.stackOptions?.layerOptions?.version}`,
					},
				},
			);
			layers.push(existingLayer);
		}

		const { function: lambdaFunction } = new BaseLambdaConstruct(this, 'lambda', {
			stage: props.stackOptions?.stage,
			stackName: props.stackName,
			options: {
				lambdaOptions: { layers },
			},
		});

		new BaseApiGatewayV2Construct(this, 'apiGateway', {
			handlerFunctions: [lambdaFunction],
			options: {
				gatewayOptions: {
					apiName: props.stackName,
					corsPreflight: {
						allowOrigins: ['*'],
					}
				},
				routeOptions: [
					{
						path: '/{proxy+}',
						methods: [HttpMethod.ANY],
					}
				]
			}
		});

	}
}
