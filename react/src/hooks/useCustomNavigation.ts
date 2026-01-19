import { useCallback, useEffect, useMemo, useRef, } from 'react';
import {
	NavigateOptions,
	useLoaderData,
	useLocation,
	useMatches,
	useNavigate,
	useNavigationType,
	useParams,
} from "react-router-dom";

interface ICurrentNavigationMetadata {
	readonly path: string;
	navigate: (url: string, options?: NavigateOptions & { queries?: Record<string, any> }) => void;
	readonly query: Record<string, string>;
	readonly data?: any;
	readonly state?: any;
	readonly matchedData?: Record<string, any>;
	readonly hash?: string;
	readonly url: string;
	readonly params: Record<string, string | undefined>;
	readonly fullUrl: string;
	readonly navigationType: string;
}

/* -------------------------------------------------- */
/* helpers                                            */
/* -------------------------------------------------- */

function stripFunctions<T extends Record<string, any>>(obj: T) {
	return Object.fromEntries(
		Object.entries(obj).filter(([, v]) => typeof v !== 'function')
	) as T;
}

function debugLog(enableDebug: boolean | undefined, ...args: any[]) {
	if (!enableDebug) return;
	console.log('[useCustomNavigation]', ...args);
}

/* -------------------------------------------------- */
/* hook                                               */
/* -------------------------------------------------- */

export function useCustomNavigation(
	onRouteChange?: (info: ICurrentNavigationMetadata) => void,
	enableDebug?: boolean
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
				? value.forEach(val => query.append(key, String(val)))
				: query.set(key, String(value));
		});

		return query.toString() ? `?${query}` : '';
	}, []);

	const query = useMemo(() => {
		const q = Object.fromEntries(new URLSearchParams(location.search).entries());
		debugLog(enableDebug, 'Parsed query:', q);
		return q;
	}, [location.search, enableDebug]);

	const navigate = useCallback(
		(url: string, options?: NavigateOptions & { queries?: Record<string, any>; }) => {
			const { queries = {}, ...rest } = options || {};
			const finalUrl = `${url}${buildQueryString(queries)}`;

			debugLog(enableDebug, 'navigate() called →', finalUrl);
			navigateFn(finalUrl, rest);
		},
		[navigateFn, buildQueryString, enableDebug]
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
		enableDebug
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
