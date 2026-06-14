import validator from "validator";
import type * as ValidatorTypes from "validator";

import { boolean, email, ipv4, ipv6, iso, number, string, url, uuid } from "zod";

/**
 * Validates UUID values.
 */
export const UuidValidationSchema = uuid();

/**
 * Validates email addresses.
 */
export const EmailValidationSchema = email();

/**
 * Creates a password validation schema.
 *
 * @param min Minimum length. Default: 6.
 * @param max Maximum length. Default: 100.
 */
export const PasswordValidationSchema = (
	min = 6,
	max = 100
) =>
	string()
		.min(min)
		.max(max);

/**
 * Creates a required string validation schema.
 */
export const RequiredStringValidationSchema = () =>
	string()
		.trim()
		.min(1);

/**
 * Creates a name validation schema.
 *
 * @param min Minimum length. Default: 2.
 * @param max Maximum length. Default: 100.
 */
export const NameValidationSchema = (
	min = 2,
	max = 100
) =>
	string()
		.trim()
		.min(min)
		.max(max);

/**
 * Creates a first name validation schema.
 */
export const FirstNameValidationSchema = NameValidationSchema;

/**
 * Creates a last name validation schema.
 */
export const LastNameValidationSchema = NameValidationSchema;

/**
 * Creates a username validation schema.
 */
export const UsernameValidationSchema = () =>
	string()
		.trim()
		.min(3)
		.max(30)
		.regex(/^[a-zA-Z0-9_]+$/);

/**
 * Creates a phone number validation schema.
 */
export const PhoneNumberValidationSchema = () =>
	string()
		.trim()
		.min(7)
		.max(20);

/**
 * Creates a URL validation schema.
 */
export const UrlValidationSchema = url();

/**
 * Creates a slug validation schema.
 */
export const SlugValidationSchema = () =>
	string()
		.trim()
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/**
 * Creates a hexadecimal colour validation schema.
 */
export const HexColorValidationSchema = () =>
	string()
		.regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/);

/**
 * Creates an OTP validation schema.
 *
 * @param length OTP length. Default: 6.
 */
export const OtpValidationSchema = (
	length = 6
) =>
	string()
		.length(length)
		.regex(/^\d+$/);

/**
 * Creates a token validation schema.
 */
export const TokenValidationSchema = () =>
	string()
		.min(1);

/**
 * Creates a description validation schema.
 *
 * @param max Maximum length. Default: 1000.
 */
export const DescriptionValidationSchema = (
	max = 1000
) =>
	string()
		.trim()
		.max(max);

/**
 * Validates ISO datetime strings.
 */
export const DateTimeValidationSchema = iso.datetime();

/**
 * Creates a positive number validation schema.
 */
export const PositiveNumberValidationSchema = () =>
	number()
		.positive();

/**
 * Creates a non-negative number validation schema.
 */
export const NonNegativeNumberValidationSchema = () =>
	number()
		.nonnegative();

/**
 * Validates boolean values.
 */
export const BooleanValidationSchema = boolean();

/**
 * Creates a page validation schema.
 */
export const PageValidationSchema = () =>
	number()
		.int()
		.min(1);

/**
 * Creates a page size validation schema.
 *
 * @param max Maximum page size. Default: `100`.
 */
export const PageSizeValidationSchema = (
	max = 100
) =>
	number()
		.int()
		.min(1)
		.max(max);

/**
 * Creates a search query validation schema.
 *
 * @param max Maximum length. Default: `200`.
 */
export const SearchQueryValidationSchema = (
	max = 200
) =>
	string()
		.trim()
		.max(max);


/**
 * Creates a country code validation schema.
 *
 * Example: NG, US, CA
 */
export const CountryCodeValidationSchema = () => string().length(2).toUpperCase();

/**
 * Creates a currency code validation schema.
 *
 * Example: NGN, USD, CAD
 */
export const CurrencyCodeValidationSchema = () => string().length(3).toUpperCase();

/**
 * Creates a language code validation schema.
 *
 * Example: en, fr
*/
export const LanguageCodeValidationSchema = () => string().min(2).max(10);

/**
 * Creates a MIME type validation schema.
 *
 * Example: image/png
 */
export const MimeTypeValidationSchema = () => string().regex(/^[a-z]+\/[a-z0-9.+-]+$/i);

/** * Creates a file extension validation schema. * * Example: png, pdf */ export const FileExtensionValidationSchema = () => string().regex(/^[a-z0-9]+$/i);

/**
 * Creates an IPv4 or IPv6 validation schema.
 */
export const IpAddressValidationSchema = () => ipv4().or(ipv6());

/**
 * Creates a latitude validation schema.
 */
export const LatitudeValidationSchema = () => number().min(-90).max(90);

/**
 * Creates a longitude validation schema.
 */
export const LongitudeValidationSchema = () => number().min(-180).max(180);

export const {
	blacklist,
	escape,
	isByteLength,
	isLuhnNumber,
	contains,
	equals,
	isAfter,
	isAlpha,
	isAlphanumeric,
	isAscii,
	isBase32,
	isBase58,
	isBase64,
	isBefore,
	isBoolean,
	isBtcAddress,
	isCreditCard,
	isCurrency,
	isDate,
	isDecimal,
	isDivisibleBy,
	isEAN,
	isEmail,
	isEmpty,
	isEthereumAddress,
	isFloat,
	isFullWidth,
	isHalfWidth,
	isHash,
	isHexColor,
	isHexadecimal,
	isIBAN,
	isIP,
	isISBN,
	isISIN,
	isISO8601,
	isISRC,
	isISSN,
	isIdentityCard,
	isJSON,
	isJWT,
	isLatLong,
	isLength,
	isLocale,
	isLowercase,
	isMACAddress,
	isMD5,
	isMagnetURI,
	isMimeType,
	isMobilePhone,
	isMongoId,
	isMultibyte,
	isNumeric,
	isOctal,
	isPassportNumber,
	isPort,
	isPostalCode,
	isRFC3339,
	isRgbColor,
	isSemVer,
	isSlug,
	isStrongPassword,
	isSurrogatePair,
	isTaxID,
	isURL,
	isUUID,
	isUppercase,
	isVAT,
	matches,
	normalizeEmail,
	rtrim,
	toBoolean,
	toDate,
	toFloat,
	toInt,
	trim,
	unescape,
	whitelist,
	isAbaRouting,
	isISO15924,
	isISO31661Alpha2,
	isISO31661Alpha3,
	isISO31661Numeric,
	isISO4217,
	isISO6346,
	isISO6391,
	isInt,
	isLicensePlate,
	isTime,
	isMailtoURI,
	stripLow,
	isVariableWidth,
	isBIC,
	isDataURI,
	isHSL,
	isULID,
	isFQDN,
	isIMEI,
	ltrim,
	isFreightContainerID,
	isIPRange,
	isIn,
	isWhitelisted
} = validator;

// re-export all types (DecimalLocale, MobilePhoneLocale, etc.)
export type { ValidatorTypes };
