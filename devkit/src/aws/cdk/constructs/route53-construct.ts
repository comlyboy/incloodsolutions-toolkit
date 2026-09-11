import { Construct } from 'constructs';
import { CfnOutput } from 'aws-cdk-lib';
import {
	ARecord,
	ARecordProps,
	AaaaRecord,
	AaaaRecordProps,
	CnameRecord,
	CnameRecordProps,
	HostedZone,
	HostedZoneAttributes,
	HostedZoneProps,
	HostedZoneProviderProps,
	IHostedZone,
	TxtRecord,
	TxtRecordProps,
} from 'aws-cdk-lib/aws-route53';

import { CustomException } from '@incloodsolutions/toolkit';

import { IBaseCdkConstructProps } from '../../types';

/**
 * Props for BaseRoute53Construct
 *
 * Exactly one of `hostedZoneOptions`, `fromExistingHostedZoneAttributes`, or
 * `fromLookupOptions` must be provided to obtain the hosted zone. Records are
 * then added to that zone.
 */
interface IRoute53ConstructProps extends Omit<
	IBaseCdkConstructProps<{
		/** Create a new public hosted zone */
		readonly hostedZoneOptions?: HostedZoneProps;

		/** Import an existing hosted zone by its ID and zone name */
		readonly fromExistingHostedZoneAttributes?: HostedZoneAttributes;

		/** Look up an existing public hosted zone by domain name at synth time */
		readonly fromLookupOptions?: HostedZoneProviderProps;

		/** `A` records to add to the zone, e.g. an alias to CloudFront or API Gateway */
		readonly aRecords?: Omit<ARecordProps, 'zone'>[];

		/** `AAAA` records to add to the zone */
		readonly aaaaRecords?: Omit<AaaaRecordProps, 'zone'>[];

		/** `CNAME` records to add to the zone */
		readonly cnameRecords?: Omit<CnameRecordProps, 'zone'>[];

		/** `TXT` records to add to the zone, e.g. for domain ownership verification */
		readonly txtRecords?: Omit<TxtRecordProps, 'zone'>[];
	}>,
	'appName' | 'stackName'
> {}

/**
 * CDK construct for Route53
 *
 * Responsibilities:
 * - Creates a new public hosted zone, imports one by attributes, or looks one
 *   up by domain name (exactly one of the three is required)
 * - Optionally attaches `A`, `AAAA`, `CNAME`, and `TXT` records to that zone
 * - Exposes the hosted zone as `.hostedZone` and its ID as a CloudFormation output
 */
export class BaseRoute53Construct extends Construct {
	/** The hosted zone this construct created, imported, or looked up */
	readonly hostedZone: IHostedZone;

	/**
	 * @param scope Parent construct
	 * @param id Unique construct identifier
	 * @param props Configuration for the hosted zone and its records
	 */
	constructor(scope: Construct, id: string, props: IRoute53ConstructProps) {
		super(scope, id);

		const options = props?.options ?? {};

		if (options.hostedZoneOptions) {
			this.hostedZone = new HostedZone(
				this,
				`${id}-HostedZone`,
				options.hostedZoneOptions,
			);
		} else if (options.fromExistingHostedZoneAttributes) {
			this.hostedZone = HostedZone.fromHostedZoneAttributes(
				this,
				`${id}-HostedZone`,
				options.fromExistingHostedZoneAttributes,
			);
		} else if (options.fromLookupOptions) {
			this.hostedZone = HostedZone.fromLookup(
				this,
				`${id}-HostedZone`,
				options.fromLookupOptions,
			);
		} else {
			throw new CustomException(
				'BaseRoute53Construct requires one of hostedZoneOptions, fromExistingHostedZoneAttributes, or fromLookupOptions',
			);
		}

		options.aRecords?.forEach((record, index) => {
			new ARecord(this, `${id}-ARecord-${index}`, {
				...record,
				zone: this.hostedZone,
			});
		});

		options.aaaaRecords?.forEach((record, index) => {
			new AaaaRecord(this, `${id}-AaaaRecord-${index}`, {
				...record,
				zone: this.hostedZone,
			});
		});

		options.cnameRecords?.forEach((record, index) => {
			new CnameRecord(this, `${id}-CnameRecord-${index}`, {
				...record,
				zone: this.hostedZone,
			});
		});

		options.txtRecords?.forEach((record, index) => {
			new TxtRecord(this, `${id}-TxtRecord-${index}`, {
				...record,
				zone: this.hostedZone,
			});
		});

		/**
		 * CloudFormation output exposing the Route53 hosted zone ID
		 */
		new CfnOutput(this, 'Route53HostedZoneId', {
			value: this.hostedZone.hostedZoneId,
		});
	}
}
