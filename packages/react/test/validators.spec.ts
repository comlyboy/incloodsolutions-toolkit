import { describe, expect, it, vi } from 'vitest';

import {
	classValidatorCustomResolver,
	EmailLoginValidationSchema,
	UsernameLoginValidationSchema,
	zodCustomResolver,
} from '../src/validators';

// `@hookform/resolvers/class-validator` needs `class-validator` and
// `class-transformer`, which this package does not install. Mock it so the
// module under test can load.
vi.mock('@hookform/resolvers/class-validator', () => ({
	classValidatorResolver: vi.fn(() => 'class-validator-resolver'),
}));

describe('EmailLoginValidationSchema', () => {
	const schema = EmailLoginValidationSchema();

	it('accepts a valid email and a password of 6 to 100 characters', () => {
		expect(
			schema.safeParse({ email: 'ada@example.com', password: 'secret1' })
				.success,
		).toBe(true);
	});

	it('rejects an invalid email', () => {
		expect(
			schema.safeParse({ email: 'not-an-email', password: 'secret1' }).success,
		).toBe(false);
	});

	it('rejects a password that is too short or too long', () => {
		expect(
			schema.safeParse({ email: 'ada@example.com', password: '12345' }).success,
		).toBe(false);
		expect(
			schema.safeParse({ email: 'ada@example.com', password: 'x'.repeat(101) })
				.success,
		).toBe(false);
	});

	it('returns a fresh schema on every call', () => {
		expect(EmailLoginValidationSchema()).not.toBe(schema);
	});
});

describe('UsernameLoginValidationSchema', () => {
	const schema = UsernameLoginValidationSchema();

	it('accepts a username of 2 to 100 characters and a valid password', () => {
		expect(
			schema.safeParse({ username: 'ada', password: 'secret1' }).success,
		).toBe(true);
	});

	it('rejects a one-character username and a short password', () => {
		expect(
			schema.safeParse({ username: 'a', password: 'secret1' }).success,
		).toBe(false);
		expect(schema.safeParse({ username: 'ada', password: '123' }).success).toBe(
			false,
		);
	});
});

describe('resolver wrappers', () => {
	it('zodCustomResolver returns a react-hook-form resolver function', async () => {
		const resolver = zodCustomResolver(
			EmailLoginValidationSchema() as never,
			{},
		);
		expect(typeof resolver).toBe('function');

		const valid = await resolver(
			{ email: 'ada@example.com', password: 'secret1' },
			undefined,
			{ fields: {}, shouldUseNativeValidation: false } as never,
		);
		expect(valid.errors).toEqual({});

		const invalid = await resolver(
			{ email: 'nope', password: 'x' },
			undefined,
			{ fields: {}, shouldUseNativeValidation: false } as never,
		);
		expect(Object.keys(invalid.errors)).toEqual(
			expect.arrayContaining(['email', 'password']),
		);
	});

	it('classValidatorCustomResolver delegates to the class-validator resolver', () => {
		class Dto {}
		expect(classValidatorCustomResolver(Dto as never, {})).toBe(
			'class-validator-resolver',
		);
	});
});
