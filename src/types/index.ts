import { ApplicationEnvironmentEnum } from "src/constant";

export interface IBaseId<TType = string> {
	id: TType;
}

export interface IBaseName {
	name: string;
}

export interface IBasePassword {
	password: string;
}

export type ApplicationEnvironmentType = `${ApplicationEnvironmentEnum}`;

export type ObjectType<TValue = any, TKey extends string | number | symbol = string> = Record<TKey, TValue>;