import { describe, expect, it } from 'vitest';

import {
	CountryCodeEnum,
	countries,
	CurrencyCodeEnum,
	detectCountry,
	formatMoney,
	getCountryByCode,
	getTimezone,
	getCurrencyByCountryCode,
} from '../src/countries';

describe('country', () => {
	it('ships the full countries list', () => {
		expect(countries.length).toBeGreaterThan(240);
	});

	it('every country has a flag emoji built from its alpha-2 code', () => {
		expect(countries.every((country) => [...country.flag].length === 2)).toBe(true);
		expect(getCountryByCode('NG')?.flag).toBe('🇳🇬');
	});

	it('CountryCodeEnum and CurrencyCodeEnum match the countries data', () => {
		expect(Object.values(CountryCodeEnum).sort()).toEqual(
			countries.map((country) => country.alpha2Code).sort(),
		);
		expect(Object.values(CurrencyCodeEnum).sort()).toEqual(
			[...new Set(countries.map((country) => country.currencyCode).filter(Boolean))].sort(),
		);
		expect(CountryCodeEnum.NG).toBe('NG');
		expect(CurrencyCodeEnum.NGN).toBe('NGN');
	});

	it('getCountryByCode accepts alpha-2 and alpha-3, any case', () => {
		expect(getCountryByCode('ng')?.name).toBe('Nigeria');
		expect(getCountryByCode('NGA')?.alpha2Code).toBe('NG');
		expect(getCountryByCode('ZZ')).toBeUndefined();
	});

	it('getCurrencyByCountryCode returns the currency, or undefined', () => {
		expect(getCurrencyByCountryCode('NG')).toMatchObject({
			code: 'NGN',
			minorUnits: 2,
		});
		expect(getCurrencyByCountryCode('JP')?.minorUnits).toBe(0);
		expect(getCurrencyByCountryCode('ZZ')).toBeUndefined();
	});

	it('detectCountry uses a unique timezone', () => {
		expect(detectCountry({ timezone: 'Asia/Kolkata' })?.alpha2Code).toBe('IN');
	});

	it('detectCountry picks the main country of a shared timezone', () => {
		expect(detectCountry({ timezone: 'Africa/Lagos' })?.alpha2Code).toBe('NG');
		expect(
			detectCountry({ timezone: 'Africa/Lagos', locale: 'en' })?.alpha2Code,
		).toBe('NG');
	});

	it('detectCountry lets the locale region choose among a shared timezone', () => {
		expect(
			detectCountry({ timezone: 'Africa/Lagos', locale: 'fr-CM' })?.alpha2Code,
		).toBe('CM');
		expect(
			detectCountry({ timezone: 'Europe/Berlin', locale: 'sv-SE' })?.alpha2Code,
		).toBe('SE');
	});

	it('detectCountry understands deprecated timezone aliases', () => {
		expect(detectCountry({ timezone: 'Africa/Douala' })?.alpha2Code).toBe('CM');
	});

	it('getTimezone returns offsets in minutes, or undefined', () => {
		expect(getTimezone('Africa/Lagos')).toMatchObject({
			utcOffset: 60,
			aliasOf: null,
		});
		expect(getTimezone('Africa/Douala')?.aliasOf).toBe('Africa/Lagos');
		expect(getTimezone('Nowhere/Land')).toBeUndefined();
	});

	it('detectCountry falls back to the locale region for an unknown timezone', () => {
		expect(
			detectCountry({ timezone: 'Nowhere/Land', locale: 'fr-CA' })?.alpha2Code,
		).toBe('CA');
	});

	it('formatMoney divides by the currency minor units', () => {
		expect(formatMoney(150050, 'NGN', 'en-NG')).toBe('₦1,500.50');
		expect(formatMoney(1500, 'JPY', 'en-US')).toBe('¥1,500');
		expect(formatMoney(1500, 'kwd', 'en-US')).toContain('1.500');
	});
});
