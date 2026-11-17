import { CountryCode, countries, CurrencyCode } from './countries';

/**
 * ISO 3166 alpha-2 country codes, built from {@link countries} so it never drifts from the data.
 * Members are named after the code itself, as in `CountryCodeEnum.NG === 'NG'`. Also usable as a
 * type: `CountryCodeEnum` is the union of all codes.
 */
export const CountryCodeEnum = Object.fromEntries(
	countries.map((country) => [country.alpha2Code, country.alpha2Code]),
) as { readonly [Code in CountryCode]: Code };
export type CountryCodeEnum = CountryCode;

/**
 * ISO 4217 currency codes used by at least one country in {@link countries}, built from the data.
 * Members are named after the code itself, as in `CurrencyCodeEnum.NGN === 'NGN'`. Also usable as a
 * type: `CurrencyCodeEnum` is the union of all codes.
 */
export const CurrencyCodeEnum = Object.fromEntries(
	countries.flatMap((country) =>
		country.currencyCode ? [[country.currencyCode, country.currencyCode]] : [],
	),
) as { readonly [Code in CurrencyCode]: Code };
export type CurrencyCodeEnum = CurrencyCode;
