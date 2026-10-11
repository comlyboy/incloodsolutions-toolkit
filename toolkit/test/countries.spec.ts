import { describe, expect, it } from 'vitest';

import {
	countries,
	detectCountry,
	formatMoney,
	getCountryByCode,
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

	it('detectCountry disambiguates a shared timezone by locale region', () => {
		expect(
			detectCountry({ timezone: 'Africa/Lagos', locale: 'en-NG' })?.alpha2Code,
		).toBe('NG');
		expect(
			detectCountry({ timezone: 'Africa/Lagos', locale: 'en' }),
		).toBeUndefined();
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
