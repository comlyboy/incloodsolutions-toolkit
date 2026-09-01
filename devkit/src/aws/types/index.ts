/**
 * @packageDocumentation
 *
 * Shared types for the `Base*` CDK constructs in this package. Every construct's
 * own props interface is built by extending (and usually `Omit`-ing a few fields
 * from) {@link IBaseCdkConstructProps}.
 */

import { AppEnvironmentType, IBaseEnableDebug, ObjectType } from "@incloodsolutions/toolkit";


/**
 * Marker interface for a construct that supports a debug flag.
 *
 * Equivalent to `{ enableDebug: boolean }` (from `@incloodsolutions/toolkit`).
 */
export interface IBaseConstruct extends IBaseEnableDebug { }

/**
 * The common configuration shape accepted by every `Base*` CDK construct in this
 * package.
 *
 * Individual constructs narrow this: they set `TOptions` to their service-specific
 * option bag (e.g. `{ lambdaOptions: Partial<FunctionProps> }`) and `Omit` the
 * top-level fields they do not use.
 *
 * @typeParam TOptions - The service-specific options object, exposed as `options`.
 */
export interface IBaseCdkConstructProps<TOptions extends ObjectType = any> extends Readonly<Partial<IBaseEnableDebug>> {
	/**
	 * Deployment stage/environment. Some constructs use it to pick defaults
	 * (e.g. a longer Lambda timeout in `'production'`) and to set `NODE_ENV`.
	 */
	readonly stage?: AppEnvironmentType;
	/** Service-specific options for the wrapped AWS resource(s). */
	readonly options?: TOptions;
	/** Stack name, used by some constructs to derive resource names. */
	readonly stackName?: string;
	/** Application name, used by some constructs to derive resource names. */
	readonly appName?: string;
	// Also inherits `readonly enableDebug?: boolean` from IBaseEnableDebug —
	// emit verbose construct logs during synthesis (defaults to false).
}
