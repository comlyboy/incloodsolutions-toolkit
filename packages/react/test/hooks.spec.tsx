import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCustomReactHookForm } from '../src/hooks/useHookForm';
import { useKeyEvent } from '../src/hooks/useKeyEvent';
import { usePageMetadata } from '../src/hooks/usePageMetadata';

afterEach(() => {
	cleanup();
	document.head.innerHTML = '';
	document.title = '';
	document.body.removeAttribute('style');
});

const press = (type: 'keydown' | 'keyup', key: string) =>
	document.dispatchEvent(new KeyboardEvent(type, { key, cancelable: true }));

describe('useKeyEvent', () => {
	it('runs the action when any listed key is released (default keyup, matchAll off)', () => {
		const action = vi.fn();
		renderHook(() =>
			useKeyEvent({
				combinations: { keys: ['Escape', 'q'] },
				returnedAction: action,
			}),
		);
		press('keyup', 'q');
		expect(action).toHaveBeenCalledTimes(1);
		press('keyup', 'x');
		expect(action).toHaveBeenCalledTimes(1);
	});

	it('matches keys case-insensitively and prevents the default action', () => {
		const action = vi.fn();
		renderHook(() =>
			useKeyEvent({ combinations: { keys: ['S'] }, returnedAction: action }),
		);
		const event = new KeyboardEvent('keyup', { key: 's', cancelable: true });
		document.dispatchEvent(event);
		expect(action).toHaveBeenCalledTimes(1);
		expect(event.defaultPrevented).toBe(true);
	});

	it('with matchAll and keydown, needs every key held', () => {
		const action = vi.fn();
		renderHook(() =>
			useKeyEvent({
				combinations: { keys: ['Control', 's'], matchAll: true },
				eventType: 'keydown',
				returnedAction: action,
			}),
		);
		press('keydown', 's');
		expect(action).not.toHaveBeenCalled();
		press('keydown', 'Control');
		expect(action).toHaveBeenCalledTimes(1);
	});

	it('stops listening after unmount', () => {
		const action = vi.fn();
		const { unmount } = renderHook(() =>
			useKeyEvent({ combinations: { keys: ['a'] }, returnedAction: action }),
		);
		unmount();
		press('keyup', 'a');
		expect(action).not.toHaveBeenCalled();
	});
});

describe('usePageMetadata', () => {
	const meta = (attribute: string, value: string) =>
		document.head
			.querySelector(`meta[${attribute}="${value}"]`)
			?.getAttribute('content');

	it('sets the title, description and Open Graph / Twitter tags', () => {
		renderHook(() =>
			usePageMetadata({
				title: 'Dashboard',
				description: 'Your account overview',
				ogImage: '/og.png',
			}),
		);
		expect(document.title).toBe('Dashboard');
		expect(meta('name', 'description')).toBe('Your account overview');
		expect(meta('property', 'og:title')).toBe('Dashboard');
		expect(meta('name', 'twitter:title')).toBe('Dashboard');
		expect(meta('property', 'og:description')).toBe('Your account overview');
		expect(meta('property', 'og:image')).toBe('/og.png');
		expect(meta('name', 'twitter:image')).toBe('/og.png');
	});

	it('always sets og:type and a default summary_large_image twitter card', () => {
		renderHook(() => usePageMetadata({ title: 'x' }));
		expect(meta('property', 'og:type')).toBe('website');
		expect(meta('name', 'twitter:card')).toBe('summary_large_image');
	});

	it('uses the given twitterCardType', () => {
		renderHook(() =>
			usePageMetadata({ title: 'x', twitterCardType: 'summary' }),
		);
		expect(meta('name', 'twitter:card')).toBe('summary');
	});

	it('reuses an existing meta tag instead of adding a second one', () => {
		const { rerender } = renderHook(
			({ description }) => usePageMetadata({ description }),
			{ initialProps: { description: 'first' } },
		);
		rerender({ description: 'second' });
		expect(
			document.head.querySelectorAll('meta[name="description"]'),
		).toHaveLength(1);
		expect(meta('name', 'description')).toBe('second');
	});

	it('applies a body background image and removes it on unmount', () => {
		const { unmount } = renderHook(() =>
			usePageMetadata({ backgroundImageUrl: '/bg.png' }),
		);
		expect(document.body.style.backgroundImage).toContain('/bg.png');
		expect(document.body.style.backgroundSize).toBe('cover');
		unmount();
		expect(document.body.style.backgroundImage).toBe('');
	});

	it('leaves the body alone when no background is requested', () => {
		renderHook(() => usePageMetadata({ title: 'x' }));
		expect(document.body.style.backgroundImage).toBe('');
	});
});

describe('useCustomReactHookForm', () => {
	it('returns a react-hook-form instance that validates on every event (mode all)', () => {
		const resolver = vi.fn(async (values: unknown) => ({ values, errors: {} }));
		const { result } = renderHook(() =>
			useCustomReactHookForm(resolver as never),
		);
		expect(typeof result.current.handleSubmit).toBe('function');
		expect(result.current.control._options.mode).toBe('all');
	});

	it('lets the caller override the mode', () => {
		const resolver = vi.fn(async (values: unknown) => ({ values, errors: {} }));
		const { result } = renderHook(() =>
			useCustomReactHookForm(resolver as never, { mode: 'onSubmit' }),
		);
		expect(result.current.control._options.mode).toBe('onSubmit');
	});
});
