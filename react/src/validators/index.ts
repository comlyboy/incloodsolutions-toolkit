import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { joiResolver } from '@hookform/resolvers/joi';
import { zodResolver } from '@hookform/resolvers/zod';
import { FieldValues, Resolver } from 'react-hook-form';
import { object, string } from 'zod';

import { ObjectType } from '@incloodsolutions/toolkit';

/**
 * Wraps a Zod schema as a `react-hook-form` resolver (`@hookform/resolvers/zod`).
 *
 * @typeParam TSchema - The form values shape.
 * @param schema - A Zod schema.
 * @param _ - Reserved options object; currently unused, pass `{}`.
 * @returns A resolver to hand to `useForm({ resolver })`.
 */
export function zodCustomResolver<TSchema extends FieldValues = ObjectType>(
	schema: TSchema,
	{}: {},
) {
	return zodResolver(schema as any) as any;
}

/**
 * Wraps a `class-validator` DTO class as a `react-hook-form` resolver
 * (`@hookform/resolvers/class-validator`).
 *
 * @typeParam TSchema - The form values shape.
 * @param schema - A class decorated with `class-validator` decorators.
 * @param _ - Reserved options object; currently unused, pass `{}`.
 * @returns A `Resolver<TSchema>`.
 */
export function classValidatorCustomResolver<
	TSchema extends FieldValues = ObjectType,
>(schema: TSchema, {}: {}) {
	return classValidatorResolver(schema) as Resolver<TSchema>;
}

/**
 * Wraps a Joi schema as a `react-hook-form` resolver (`@hookform/resolvers/joi`).
 *
 * @typeParam TSchema - The form values shape.
 * @param schema - A Joi schema.
 * @param _ - Reserved options object; currently unused, pass `{}`.
 * @returns A `Resolver<TSchema>`.
 */
export function joiCustomResolver<TSchema extends FieldValues = ObjectType>(
	schema: TSchema,
	{}: {},
) {
	return joiResolver(schema as any) as Resolver<TSchema>;
}

/**
 * Zod schema factory for an email + password login form.
 *
 * @returns A `z.object({ email, password })` schema.
 *
 * @remarks
 * **Broken in the current release.** It references `EmailValidationSchema` and
 * `PasswordValidationSchema`, which are not imported in this module, so calling
 * it throws a `ReferenceError`. Until fixed, build the schema yourself using
 * `EmailValidationSchema` / `PasswordValidationSchema` from
 * `@incloodsolutions/toolkit`.
 */
export const EmailLoginValidationSchema = () =>
	object({
		email: EmailValidationSchema,
		password: PasswordValidationSchema(),
	});

/**
 * Zod schema factory for a username + password login form. `username` is a
 * trimmed string of 2–100 characters.
 *
 * @returns A `z.object({ username, password })` schema.
 *
 * @remarks
 * **Broken in the current release.** It references `PasswordValidationSchema`,
 * which is not imported in this module, so calling it throws a `ReferenceError`.
 */
export const UsernameLoginValidationSchema = () =>
	object({
		username: string().min(2).max(100),
		password: PasswordValidationSchema(),
	});
