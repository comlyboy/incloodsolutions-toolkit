import { AppEnvironmentType, IBaseEnableDebug, ObjectType } from "@incloodsolutions/toolkit";


/** Base interface that enables debugging features */
export interface IBaseConstruct extends IBaseEnableDebug { }

/** Base interface for CDK construct configuration */
export interface IBaseCdkConstructProps<TOptions extends ObjectType = any> extends Readonly<Partial<IBaseEnableDebug>> {
	/** Deployment stage/environment */
	readonly stage?: AppEnvironmentType;
	/** Additional construct options */
	readonly options?: Readonly<TOptions>;
	/** Optional stack name */
	readonly stackName?: string;
	/** Optional application name */
	readonly appName?: string;
}
