import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
	NavigateOptions,
	useLoaderData,
	useLocation,
	useMatches,
	useNavigate,
	useNavigationType,
	useParams,
} from 'react-router-dom';

/**
 * The snapshot of routing state returned by {@link useCustomNavigation}.
 */
interface ICurrentNavigationMetadata {
	/** `location.pathname`. */
	readonly path: string;
	/**
	 * Navigate to `url`, optionally appending a query string built from
	 * `options.queries` (arrays produce repeated keys, falsy values are skipped).
	 * Remaining options are forwarded to React Router's `navigate`.
	 */
	navigate: (
		url: string,
		options?: NavigateOptions & { queries?: Record<string, any> },
	) => void;
	/** Parsed query-string parameters as a flat string map. */
	readonly query: Record<string, string>;
	/** Value from the route's loader (`useLoaderData`). */
	readonly data?: any;
	/** `location.state`. */
	readonly state?: any;
	/** Matched route handles/data (`useMatches`). */
	readonly matchedData?: Record<string, any>;
	/** `location.hash` (or `undefined` when empty). */
	readonly hash?: string;
	/** `pathname + search + hash`. */
	readonly url: string;
	/** Dynamic route params (`useParams`). */
	readonly params: Record<string, string | undefined>;
	/** Absolute URL: `origin + pathname + search + hash`. */
	readonly fullUrl: string;
	/** `'POP' | 'PUSH' | 'REPLACE'` from `useNavigationType`. */
	readonly navigationType: string;
}

/* -------------------------------------------------- */
/* helpers                                            */
/* -------------------------------------------------- */

function stripFunctions<T extends Record<string, any>>(obj: T) {
	return Object.fromEntries(
		Object.entries(obj).filter(([, v]) => typeof v !== 'function'),
	) as T;
}

function debugLog(enableDebug: boolean | undefined, ...args: any[]) {
	if (!enableDebug) return;
	console.log('[useCustomNavigation]', ...args);
}

/* -------------------------------------------------- */
/* hook                                               */
/* -------------------------------------------------- */

/**
 * A convenience wrapper over several React Router hooks that returns one
 * {@link ICurrentNavigationMetadata} object plus a query-string-aware `navigate`.
 *
 * `onRouteChange` fires only when the route actually changes: the metadata is
 * serialised (with functions stripped) and compared to the previous value.
 *
 * @param onRouteChange - Called with the fresh metadata whenever the route changes.
 * @param enableDebug - When `true`, logs internal steps to the console. Defaults to `false`.
 * @returns The current navigation metadata (recomputed on every relevant change).
 *
 * @example
 * const nav = useCustomNavigation((info) => track(info.path));
 * nav.navigate('/users', { queries: { page: 2 }, replace: true });
 */
export function useCustomNavigation(
	onRouteChange?: (info: ICurrentNavigationMetadata) => void,
	enableDebug?: boolean,
): ICurrentNavigationMetadata {
	const navigateFn = useNavigate();
	const location = useLocation();
	const params = useParams();
	const loader = useLoaderData();
	const matchedData = useMatches();
	const navigationType = useNavigationType();

	/* ---------- query helpers ---------- */

	const buildQueryString = useCallback((params: Record<string, any>) => {
		const query = new URLSearchParams();

		Object.entries(params).forEach(([key, value]) => {
			if (!value) return;
			Array.isArray(value)
				? value.forEach((val) => query.append(key, String(val)))
				: query.set(key, String(value));
		});

		return query.toString() ? `?${query}` : '';
	}, []);

	const query = useMemo(() => {
		const q = Object.fromEntries(
			new URLSearchParams(location.search).entries(),
		);
		debugLog(enableDebug, 'Parsed query:', q);
		return q;
	}, [location.search, enableDebug]);

	const navigate = useCallback(
		(
			url: string,
			options?: NavigateOptions & { queries?: Record<string, any> },
		) => {
			const { queries = {}, ...rest } = options || {};
			const finalUrl = `${url}${buildQueryString(queries)}`;

			debugLog(enableDebug, 'navigate() called →', finalUrl);
			navigateFn(finalUrl, rest);
		},
		[navigateFn, buildQueryString, enableDebug],
	);

	/* ---------- metadata ---------- */

	const metadata = useMemo<ICurrentNavigationMetadata>(() => {
		const meta = {
			params,
			navigate,
			data: loader,
			matchedData,
			state: location.state,
			query,
			path: location.pathname,
			url: `${location.pathname}${location.search}${location.hash || ''}`,
			fullUrl: `${window.location.origin}${location.pathname}${location.search}${location.hash || ''}`,
			hash: location.hash || undefined,
			navigationType,
		};

		debugLog(enableDebug, 'Metadata created:', meta);
		return meta;
	}, [
		params,
		navigate,
		loader,
		matchedData,
		location.pathname,
		location.search,
		location.state,
		location.hash,
		navigationType,
		query,
		enableDebug,
	]);

	/* ---------- route-change detection ---------- */

	const stableMetadata = useMemo(() => {
		const stripped = stripFunctions(metadata);
		debugLog(enableDebug, 'Stable metadata (functions stripped):', stripped);
		return stripped;
	}, [metadata, enableDebug]);

	const metadataKey = useMemo(() => {
		const key = JSON.stringify(stableMetadata);
		debugLog(enableDebug, 'Metadata key:', key);
		return key;
	}, [stableMetadata, enableDebug]);

	const lastKeyRef = useRef<string | null>(null);

	useEffect(() => {
		if (lastKeyRef.current === metadataKey) {
			debugLog(enableDebug, 'Effect skipped (no route change)');
			return;
		}

		debugLog(enableDebug, 'Route change detected');
		lastKeyRef.current = metadataKey;
		onRouteChange?.(metadata);
	}, [metadataKey, onRouteChange, metadata, enableDebug]);

	return metadata;
}
