import { useCallback, useEffect, useMemo } from "react";
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

export function useCustomNavigation(
	onRouteChange?: (info: ICurrentNavigationMetadata) => void
): ICurrentNavigationMetadata {
	const navigateFunction = useNavigate();
	const location = useLocation();
	const params = useParams();
	const loader = useLoaderData();
	const matchedData = useMatches();
	const navigationType = useNavigationType();

	const buildQueryString = useCallback((params: Record<string, any>): string => {
		const query = new URLSearchParams();
		Object.entries(params).forEach(([key, value]) => {
			if (value === undefined || value === null) return;
			Array.isArray(value)
				? value.forEach(val => query.append(key, String(val)))
				: query.set(key, String(value));
		});
		return query.toString() ? `?${query}` : "";
	}, []);

	const getQueries = useCallback((): Record<string, string> => {
		return Object.fromEntries(new URLSearchParams(location.search).entries());
	}, [location.search]);

	const navigate = useCallback(
		(url: string, options?: NavigateOptions & { queries?: Record<string, any> }) => {
			const { queries = {}, ...rest } = options || {};
			navigateFunction(`${url}${buildQueryString(queries)}`, rest);
		},
		[navigateFunction, buildQueryString]
	);

	const metadata = useMemo<ICurrentNavigationMetadata>(
		() => ({
			params,
			navigate,
			data: loader,
			matchedData,
			state: location.state,
			query: getQueries(),
			path: location.pathname,
			url: `${location.pathname}${location.search}`,
			fullUrl: `${window.location.origin}${location.pathname}${location.search}${location.hash || ''}`,
			hash: location.hash || undefined,
			navigationType,
		}),
		[
			params,
			navigate,
			loader,
			matchedData,
			location.pathname,
			location.search,
			location.state,
			location.hash,
			navigationType,
			getQueries,
		]
	);

	useEffect(() => {
		onRouteChange?.(metadata);
	}, [metadata, onRouteChange]);

	return metadata;
}
