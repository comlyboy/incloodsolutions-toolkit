

import { classValidatorResolver } from "@hookform/resolvers/class-validator";
import { joiResolver } from "@hookform/resolvers/joi";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldValues, Resolver } from "react-hook-form";
import { object, string } from "zod";

import { ObjectType } from "@incloodsolutions/toolkit";


export function zodCustomResolver<TSchema extends FieldValues = ObjectType>(schema: TSchema, { }: {}) {
	return zodResolver(schema as any) as any
}
export function classValidatorCustomResolver<TSchema extends FieldValues = ObjectType>(schema: TSchema, { }: {}) {
	return classValidatorResolver(schema) as Resolver<TSchema>;
}
export function joiCustomResolver<TSchema extends FieldValues = ObjectType>(schema: TSchema, { }: {}) {
	return joiResolver(schema as any) as Resolver<TSchema>;
}

export const EmailLoginValidationSchema = () => object({
	email: EmailValidationSchema,
	password: PasswordValidationSchema()
});

export const UsernameLoginValidationSchema = () => object({
	username: string().min(2).max(100),
	password: PasswordValidationSchema()
});
