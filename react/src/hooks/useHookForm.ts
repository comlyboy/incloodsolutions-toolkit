import { Resolver, useForm, UseFormProps, UseFormReturn } from "react-hook-form";

import { ObjectType } from "@incloodsolutions/toolkit";

export function useCustomReactHookForm<TSchema extends ObjectType>(resolveSchema: TSchema, props?: Omit<UseFormProps<TSchema>, 'resolver'>) {
	return useForm({
		mode: props?.mode || 'all',
		...props as UseFormProps,
		resolver: resolveSchema as unknown as Resolver<ObjectType, any, TSchema>,
	}) as unknown as UseFormReturn<TSchema, any, TSchema>;
}
