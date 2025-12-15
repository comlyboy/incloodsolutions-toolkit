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

/* -------------------------------------------------- */
/* hook                                               */
/* -------------------------------------------------- */

export function useCustomNavigation(
	onRouteChange?: (info: ICurrentNavigationMetadata) => void
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

		Object.entries(params).forEach(([k, v]) => {
			if (v == null) return;
			Array.isArray(v)
				? v.forEach(val => query.append(k, String(val)))
				: query.set(k, String(v));
		});

		return query.toString() ? `?${query}` : '';
	}, []);

	const query = useMemo(
		() => Object.fromEntries(new URLSearchParams(location.search).entries()),
		[location.search]
	);

	const navigate = useCallback(
		(url: string, options?: NavigateOptions & { queries?: Record<string, any> }) => {
			const { queries = {}, ...rest } = options || {};
			navigateFn(`${url}${buildQueryString(queries)}`, rest);
		},
		[navigateFn, buildQueryString]
	);

	/* ---------- metadata ---------- */

	const metadata = useMemo<ICurrentNavigationMetadata>(() => ({
		params,
		navigate,               // function (ignored later)
		data: loader,
		matchedData,
		state: location.state,
		query,
		path: location.pathname,
		url: `${location.pathname}${location.search}`,
		fullUrl: `${window.location.origin}${location.pathname}${location.search}${location.hash || ''}`,
		hash: location.hash || undefined,
		navigationType,
	}), [
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
	]);

	/* ---------- route-change detection ---------- */

	const stableMetadata = useMemo(
		() => stripFunctions(metadata),
		[metadata]
	);

	const metadataKey = useMemo(
		() => JSON.stringify(stableMetadata),
		[stableMetadata]
	);

	const lastKeyRef = useRef<string | null>(null);

	useEffect(() => {
		if (lastKeyRef.current === metadataKey) return;

		lastKeyRef.current = metadataKey;
		onRouteChange?.(metadata);
	}, [metadataKey, onRouteChange, metadata]);

	return metadata;
}
