import { useEffect, useMemo } from "react";

interface PageMetaOptions {
	title?: string;
	description?: string;
	backgroundImageUrl?: string;
	backgroundStyle?: Partial<CSSStyleDeclaration>;
	ogImage?: string;
	twitterCardType?: "summary" | "summary_large_image";
}

function setOrCreateMeta(attrName: string, attrValue: string, content: string) {
	let meta = document.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrValue}"]`);
	if (!meta) {
		meta = document.createElement("meta");
		meta.setAttribute(attrName, attrValue);
		document.head.appendChild(meta);
	}
	meta.setAttribute("content", content);
}

export function usePageMeta({
	title,
	description,
	backgroundImageUrl,
	backgroundStyle = {},
	ogImage,
	twitterCardType = "summary_large_image",
}: PageMetaOptions) {
	const hasBackgroundStyle = useMemo(
		() => backgroundImageUrl || Object.keys(backgroundStyle).length > 0,
		[backgroundImageUrl, backgroundStyle]
	);

	useEffect(() => {
		// Title
		if (title) {
			document.title = title;
			setOrCreateMeta("property", "og:title", title);
			setOrCreateMeta("name", "twitter:title", title);
		}

		// Description
		if (description) {
			setOrCreateMeta("name", "description", description);
			setOrCreateMeta("property", "og:description", description);
			setOrCreateMeta("name", "twitter:description", description);
		}

		// Images
		if (ogImage) {
			setOrCreateMeta("property", "og:image", ogImage);
			setOrCreateMeta("name", "twitter:image", ogImage);
		}

		// Defaults
		setOrCreateMeta("property", "og:type", "website");
		setOrCreateMeta("name", "twitter:card", twitterCardType);

		// Background styles
		if (hasBackgroundStyle) {
			const body = document.body;

			if (backgroundImageUrl) {
				body.style.backgroundImage = `url("${backgroundImageUrl}")`;
				body.style.backgroundSize = "cover";
				body.style.backgroundRepeat = "no-repeat";
				body.style.backgroundPosition = "center";
			}

			Object.entries(backgroundStyle).forEach(([key, value]) => {
				if (value) {
					(body.style[key as any] as any) = value;
				}
			});
		}

		return () => {
			if (hasBackgroundStyle) {
				document.body.style.backgroundImage = "";
				Object.keys(backgroundStyle).forEach(key => {
					document.body.style[key as any] = "";
				});
			}
		};
	}, [
		title,
		description,
		backgroundImageUrl,
		backgroundStyle,
		ogImage,
		twitterCardType,
		hasBackgroundStyle,
	]);
}
