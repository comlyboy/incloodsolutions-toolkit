import {
	Resolver,
	useForm,
	UseFormProps,
	UseFormReturn,
} from 'react-hook-form';

import { ObjectType } from '@incloodsolutions/toolkit';

/**
 * Thin wrapper around `react-hook-form`'s `useForm` that wires a resolver and
 * defaults the validation `mode` to `'all'` (validate on change, blur, and submit).
 *
 * @typeParam TSchema - The form values shape.
 * @param resolveSchema - A resolver (or schema treated as one) passed straight to
 *   `useForm({ resolver })`. Pair with the `*CustomResolver` helpers in
 *   `../validators` when starting from a Zod/Joi/class-validator schema.
 * @param props - Any `UseFormProps` except `resolver`. `mode` defaults to `'all'`
 *   but can be overridden here.
 * @returns The `UseFormReturn<TSchema>` object.
 *
 * @remarks Currently not re-exported from the package entry point; import from
 *   this module directly if needed.
 */
export function useCustomReactHookForm<TSchema extends ObjectType>(
	resolveSchema: TSchema,
	props?: Omit<UseFormProps<TSchema>, 'resolver'>,
) {
	return useForm({
		mode: props?.mode || 'all',
		...(props as UseFormProps),
		resolver: resolveSchema as unknown as Resolver<ObjectType, any, TSchema>,
	}) as unknown as UseFormReturn<TSchema, any, TSchema>;
}
