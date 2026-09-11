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
 * `fromLookupOptions` must be provided to obtain the hosted zone — a hosted
 * zone is the container Route53 uses to hold every DNS record for one domain.
 * Records are then added to that zone via `aRecords` / `aaaaRecords` /
 * `cnameRecords` / `txtRecords`.
 */
interface IRoute53ConstructProps extends Omit<
	IBaseCdkConstructProps<{
		/**
		 * Create a brand-new public hosted zone for `zoneName`. Use this when
		 * Route53 has not yet been given authority over the domain — CDK also
		 * prints the four NS records you must set as the domain's nameservers at
		 * the registrar to actually delegate DNS to this zone.
		 */
		readonly hostedZoneOptions?: HostedZoneProps;

		/**
		 * Reference an existing hosted zone by its ID and zone name, without
		 * creating a new one. Cheapest and most predictable option — no synth-time
		 * AWS API call, no risk of creating a duplicate zone — but you must already
		 * know the hosted zone ID (from the console, another stack's output, etc.).
		 */
		readonly fromExistingHostedZoneAttributes?: HostedZoneAttributes;

		/**
		 * Resolve an existing public hosted zone by domain name via an AWS API
		 * call made while CDK synthesises the stack (not at deploy time). Convenient
		 * when you only know the domain name, but requires AWS credentials at synth
		 * and re-runs that lookup (and may cache stale results) on every synth.
		 */
		readonly fromLookupOptions?: HostedZoneProviderProps;

		/**
		 * `A` records — map this zone (or a subdomain) to one or more IPv4
		 * addresses, or, via `target: RecordTarget.fromAlias(...)`, "alias" the
		 * record directly to an AWS resource (CloudFront, API Gateway custom
		 * domain, ALB, another Route53 record, …). Alias `A` records are free,
		 * auto-update if the target's IP changes, and — unlike `CNAME` — are the
		 * only way to point the zone apex (`example.com` itself, not a subdomain)
		 * at an AWS resource. Use this for "point my (sub)domain at this AWS
		 * service" or "point it at a fixed IPv4 address".
		 */
		readonly aRecords?: Omit<ARecordProps, 'zone'>[];

		/**
		 * `AAAA` records — the IPv6 counterpart to `A` records: map this zone or a
		 * subdomain to IPv6 addresses, or alias to an AWS resource, the same way
		 * `aRecords` does for IPv4. Add these alongside `aRecords` (not instead of)
		 * when the target also needs to be reachable over IPv6.
		 */
		readonly aaaaRecords?: Omit<AaaaRecordProps, 'zone'>[];

		/**
		 * `CNAME` records — alias a subdomain to another DNS name (not an IP
		 * address), e.g. `www.example.com` → `example.com`, or a subdomain to a
		 * third-party service's domain (a SaaS custom-domain setup). DNS rules
		 * forbid a `CNAME` at the zone apex and forbid mixing it with any other
		 * record type on the same name — use an alias `A`/`AAAA` record instead
		 * for the apex or for AWS-resource targets.
		 */
		readonly cnameRecords?: Omit<CnameRecordProps, 'zone'>[];

		/**
		 * `TXT` records — arbitrary text attached to a name, not used for routing
		 * traffic at all. The standard way to prove domain ownership (ACM
		 * certificate DNS validation, Google/Microsoft/other SaaS site
		 * verification) and to publish email-authentication policy (SPF, DKIM,
		 * DMARC). Each string in `values` becomes one quoted TXT value.
		 */
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
