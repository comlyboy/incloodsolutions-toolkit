import { countries, ICountry } from './countries';

export * from './countries';

/** The currency a country uses day to day, as returned by {@link getCurrencyByCountryCode}. */
export interface ICountryCurrency {
	/** ISO 4217 code, as in "NGN". */
	code: string;
	name: string | null;
	/** As in "₦", "$", "Ksh". */
	symbol: string | null;
	/** ISO 4217 numeric code, as in "566". */
	numericCode: string | null;
	/** Decimal places of the smallest unit: 2 for most, 0 for JPY, 3 for KWD. */
	minorUnits: number | null;
	/** Other currencies the country also uses officially, as in ["USD"] for Panama. */
	otherCurrencyCodes: string[];
}

const DEFAULT_MINOR_UNITS = 2;

/**
 * Looks a country up by its ISO 3166 two-letter (`"NG"`) or three-letter (`"NGA"`) code,
 * case-insensitively.
 *
 * @param countryCode - Alpha-2 or alpha-3 country code.
 * @returns The matching {@link ICountry}, or `undefined` when there is none.
 *
 * @example
 * getCountryByCode('ng')?.name; // 'Nigeria'
 */
export function getCountryByCode(countryCode: string): ICountry | undefined {
	const code = countryCode.trim().toUpperCase();
	return countries.find(
		(country) => country.alpha2Code === code || country.alpha3Code === code,
	);
}

/**
 * Returns the currency a country uses, derived from the countries data.
 *
 * @param countryCode - Alpha-2 or alpha-3 country code, case-insensitive.
 * @returns The {@link ICountryCurrency}, or `undefined` when the country is unknown or has no
 *   official currency (for example Antarctica).
 *
 * @example
 * getCurrencyByCountryCode('NG'); // { code: 'NGN', symbol: '₦', minorUnits: 2, ... }
 */
export function getCurrencyByCountryCode(
	countryCode: string,
): ICountryCurrency | undefined {
	const country = getCountryByCode(countryCode);
	if (!country?.currencyCode) {
		return undefined;
	}
	return {
		code: country.currencyCode,
		name: country.currencyName,
		symbol: country.currencySymbol,
		numericCode: country.currencyNumericCode,
		minorUnits: country.minorUnits,
		otherCurrencyCodes: country.otherCurrencyCodes,
	};
}

/**
 * Detects the country a user is in from their timezone and locale.
 *
 * Timezones are shared between countries (`Africa/Lagos` is listed for Nigeria, Cameroon, Gabon
 * and others), so the result is resolved in this order:
 * 1. Exactly one country uses `timezone`: that country.
 * 2. Several do: the one matching the locale's region (`en-NG` gives `NG`), else `undefined`.
 * 3. None do: the country of the locale's region, if the locale has one.
 *
 * Both inputs default to the runtime's own (`Intl.DateTimeFormat().resolvedOptions()`), so
 * calling it with no arguments detects the current user in a browser or in Node.
 *
 * @param options.timezone - IANA timezone name, as in `"Africa/Lagos"`.
 * @param options.locale - BCP 47 locale tag, as in `"en-NG"`. Only an explicit region is used.
 * @returns The detected {@link ICountry}, or `undefined` when it cannot be told apart.
 *
 * @example
 * detectCountry({ timezone: 'America/New_York' })?.alpha2Code; // 'US'
 * detectCountry({ timezone: 'Africa/Lagos', locale: 'en-NG' })?.alpha2Code; // 'NG'
 */
export function detectCountry({
	timezone,
	locale,
}: {
	timezone?: string;
	locale?: string;
} = {}): ICountry | undefined {
	const resolvedOptions = Intl.DateTimeFormat().resolvedOptions();
	const resolvedTimezone = timezone ?? resolvedOptions.timeZone;
	const resolvedLocale = locale ?? resolvedOptions.locale;

	let localeRegion: string | undefined;
	try {
		localeRegion = new Intl.Locale(resolvedLocale).region;
	} catch {
		localeRegion = undefined;
	}

	const candidates = countries.filter((country) =>
		country.timezones.includes(resolvedTimezone),
	);
	if (candidates.length === 1) {
		return candidates[0];
	}
	if (candidates.length > 1) {
		return candidates.find((country) => country.alpha2Code === localeRegion);
	}
	return localeRegion ? getCountryByCode(localeRegion) : undefined;
}

/**
 * Formats an amount held in minor units (kobo, cents, ...) as a localised money string.
 *
 * The number of minor units per major unit comes from the countries data, so `JPY` (0 decimals)
 * and `KWD` (3 decimals) are divided correctly; an unlisted currency falls back to `Intl`'s own
 * digits.
 *
 * @param amountMinor - Amount in the currency's smallest unit, as in `150050` for 1,500.50 NGN.
 * @param currencyCode - ISO 4217 code, as in `"NGN"`. Throws a `RangeError` if it is not valid.
 * @param locale - BCP 47 locale for separators and symbol placement. Defaults to the runtime locale.
 * @returns The formatted string.
 *
 * @example
 * formatMoney(150050, 'NGN', 'en-NG'); // '₦1,500.50'
 * formatMoney(1500, 'JPY', 'ja-JP'); // '¥1,500'
 */
export function formatMoney(
	amountMinor: number,
	currencyCode: string,
	locale?: string,
): string {
	const code = currencyCode.toUpperCase();
	const formatter = new Intl.NumberFormat(locale, {
		style: 'currency',
		currency: code,
	});
	const listedMinorUnits = countries.find(
		(country) => country.currencyCode === code,
	)?.minorUnits;
	const minorUnits =
		listedMinorUnits ??
		formatter.resolvedOptions().maximumFractionDigits ??
		DEFAULT_MINOR_UNITS;
	return formatter.format(amountMinor / 10 ** minorUnits);
}
