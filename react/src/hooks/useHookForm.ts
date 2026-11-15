import {
	useForm,
	type FieldValues,
	type Resolver,
	type UseFormProps,
	type UseFormReturn,
} from 'react-hook-form';

/**
 * Thin wrapper around `react-hook-form`'s `useForm` that requires a `resolver` and defaults the
 * validation `mode` to `'all'` (validate on blur, on change, and on submit).
 *
 * @typeParam TFieldValues - The form values shape.
 * @param resolver - A resolver to hand to `useForm({ resolver })` -- build one from a schema with
 *   `zodCustomResolver`/`classValidatorCustomResolver` (`../validators`), or
 *   with `@hookform/resolvers` directly.
 * @param props - Any `UseFormProps` except `resolver`. `mode` defaults to `'all'` but can be
 *   overridden here.
 * @returns The `UseFormReturn<TFieldValues>` object.
 */
export function useCustomReactHookForm<
	TFieldValues extends FieldValues = FieldValues,
	TContext = unknown,
	TTransformedValues = TFieldValues,
>(
	resolver: Resolver<TFieldValues, TContext, TTransformedValues>,
	{
		mode = 'all',
		...props
	}: Omit<
		UseFormProps<TFieldValues, TContext, TTransformedValues>,
		'resolver'
	> = {},
): UseFormReturn<TFieldValues, TContext, TTransformedValues> {
	return useForm<TFieldValues, TContext, TTransformedValues>({
		mode,
		...props,
		resolver,
	});
}
