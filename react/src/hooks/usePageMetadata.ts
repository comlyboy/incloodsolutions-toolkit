import { useEffect, useMemo } from 'react';

/**
 * Options for {@link usePageMetadata}.
 */
interface PageMetaOptions {
	/** Document `<title>`, also mirrored to `og:title` and `twitter:title`. */
	title?: string;
	/** Meta description, also mirrored to `og:description` and `twitter:description`. */
	description?: string;
	/** URL set as a cover `background-image` on `document.body` (with `cover` / `no-repeat` / `center`). */
	backgroundImageUrl?: string;
	/** Extra inline styles applied to `document.body`. Reverted on unmount. Defaults to `{}`. */
	backgroundStyle?: Partial<CSSStyleDeclaration>;
	/** Image URL for `og:image` and `twitter:image`. */
	ogImage?: string;
	/** `twitter:card` value. Defaults to `'summary_large_image'`. */
	twitterCardType?: 'summary' | 'summary_large_image';
}

function setOrCreateMeta(attrName: string, attrValue: string, content: string) {
	let meta = document.querySelector<HTMLMetaElement>(
		`meta[${attrName}="${attrValue}"]`,
	);
	if (!meta) {
		meta = document.createElement('meta');
		meta.setAttribute(attrName, attrValue);
		document.head.appendChild(meta);
	}
	meta.setAttribute('content', content);
}

/**
 * Imperatively sets document metadata for the current page: the `<title>`, the
 * `description` meta tag, Open Graph / Twitter card tags, and (optionally) a
 * `document.body` background.
 *
 * Missing existing meta tags are created; the `og:type` (`website`) and
 * `twitter:card` tags are always set. Any body background applied here is
 * removed when the component unmounts or the inputs change.
 *
 * @param options - See {@link PageMetaOptions}. `backgroundStyle` defaults to
 *   `{}` and `twitterCardType` defaults to `'summary_large_image'`.
 *
 * @example
 * usePageMetadata({ title: 'Dashboard', description: 'Your account overview', ogImage: '/og.png' });
 */
export function usePageMetadata({
	title,
	description,
	backgroundImageUrl,
	backgroundStyle = {},
	ogImage,
	twitterCardType = 'summary_large_image',
}: PageMetaOptions) {
	const hasBackgroundStyle = useMemo(
		() => backgroundImageUrl || Object.keys(backgroundStyle).length > 0,
		[backgroundImageUrl, backgroundStyle],
	);

	useEffect(() => {
		// Title
		if (title) {
			document.title = title;
			setOrCreateMeta('property', 'og:title', title);
			setOrCreateMeta('name', 'twitter:title', title);
		}

		// Description
		if (description) {
			setOrCreateMeta('name', 'description', description);
			setOrCreateMeta('property', 'og:description', description);
			setOrCreateMeta('name', 'twitter:description', description);
		}

		// Images
		if (ogImage) {
			setOrCreateMeta('property', 'og:image', ogImage);
			setOrCreateMeta('name', 'twitter:image', ogImage);
		}

		// Defaults
		setOrCreateMeta('property', 'og:type', 'website');
		setOrCreateMeta('name', 'twitter:card', twitterCardType);

		// Background styles
		if (hasBackgroundStyle) {
			const body = document.body;

			if (backgroundImageUrl) {
				body.style.backgroundImage = `url("${backgroundImageUrl}")`;
				body.style.backgroundSize = 'cover';
				body.style.backgroundRepeat = 'no-repeat';
				body.style.backgroundPosition = 'center';
			}

			Object.entries(backgroundStyle).forEach(([key, value]) => {
				if (value) {
					(body.style[key as any] as any) = value;
				}
			});
		}

		return () => {
			if (hasBackgroundStyle) {
				document.body.style.backgroundImage = '';
				Object.keys(backgroundStyle).forEach((key) => {
					document.body.style[key as any] = '';
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
