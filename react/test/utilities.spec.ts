import { afterEach, describe, expect, it } from 'vitest';

import { getScreenSize, parseClassnames } from '../src/utilities';

describe('parseClassnames', () => {
	it('joins class names and skips falsy values', () => {
		expect(parseClassnames('a', false, undefined, null, 'b')).toBe('a b');
	});

	it('applies conditional class objects', () => {
		expect(parseClassnames('base', { hidden: false, block: true })).toBe(
			'base block',
		);
	});

	it('lets a later Tailwind class win over a conflicting earlier one', () => {
		expect(parseClassnames('px-2 py-1', 'px-4')).toBe('py-1 px-4');
		expect(parseClassnames('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
	});

	it('returns an empty string when there is nothing to join', () => {
		expect(parseClassnames()).toBe('');
		expect(parseClassnames(false, undefined)).toBe('');
	});
});

describe('getScreenSize', () => {
	const originalWidth = window.innerWidth;
	afterEach(() => {
		window.innerWidth = originalWidth;
	});

	const at = (width: number) => {
		window.innerWidth = width;
		return getScreenSize();
	};

	it('is mobile below 768px', () => {
		expect(at(320)).toBe('mobile');
		expect(at(767)).toBe('mobile');
	});

	it('is tablet from 768px up to 1023px', () => {
		expect(at(768)).toBe('tablet');
		expect(at(1023)).toBe('tablet');
	});

	it('is desktop from 1024px', () => {
		expect(at(1024)).toBe('desktop');
		expect(at(1920)).toBe('desktop');
	});
});
