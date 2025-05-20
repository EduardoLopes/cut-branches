import { intlFormatDistance, intlFormat } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { formatDate } from './format-date';

/**
 * Safely formats a date with the full format, handling invalid dates
 * @param dateInput - The date string, timestamp or Date object to format
 * @returns A formatted date string or 'Unknown date' if invalid
 */
export function safeFormatDate(dateInput: string | number | Date): string {
	try {
		// Check if the date is valid
		const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
		if (isNaN(date.getTime())) {
			throw new Error('Invalid date');
		}
		return formatDate(date);
	} catch {
		return 'Unknown date';
	}
}

/**
 * Safely formats a relative date (e.g. "2 days ago"), handling invalid dates
 * @param dateInput - The date string or timestamp to format
 * @param options - Optional intlFormatDistance options
 * @returns A formatted relative date string or 'Unknown' if invalid
 */
export function safeFormatRelativeDate(
	dateInput: string | number | Date,
	options?: { unit?: 'day' | 'month' | 'year' }
): string {
	try {
		// Check if the date is valid
		const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
		if (isNaN(date.getTime())) {
			throw new Error('Invalid date');
		}
		return intlFormatDistance(date, Date.now(), options);
	} catch {
		return 'Unknown';
	}
}

/**
 * Formats a date in the user's timezone with fallback
 * @param date - The date to format
 * @param format - The format string to use
 * @param timeZone - Optional timezone, defaults to user's local timezone
 * @returns A formatted date string in the specified timezone
 */
export function formatToUserTimezone(
	date: Date,
	format = 'yyyy-MM-dd',
	timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
	fallbackFormat?: (date: Date) => string
): string {
	try {
		return formatInTimeZone(date, timeZone, format);
	} catch (error) {
		console.error('Error formatting date:', error);
		// Fallback to ISO string if formatting fails
		return fallbackFormat ? fallbackFormat(date) : date.toISOString().split('T')[0];
	}
}

/**
 * Formats a date with detailed information using intlFormat
 * @param date - The date to format
 * @returns A formatted date string with full details
 */
export function formatDateDetailed(date: Date): string {
	try {
		return intlFormat(date, {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric'
		});
	} catch (error) {
		console.error('Error formatting date with details:', error);
		return date.toISOString();
	}
}

/**
 * Safely formats a date with detailed information using intlFormat, handling invalid dates.
 * @param dateInput - The date string, timestamp or Date object to format.
 * @returns A formatted date string with full details or a fallback string if invalid.
 */
export function safeFormatDateDetailed(dateInput: string | number | Date): string {
	try {
		const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
		if (isNaN(date.getTime())) {
			return 'Unknown date';
		}
		return intlFormat(date, {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric'
		});
	} catch (error) {
		console.error('Error formatting date with details:', error);
		try {
			const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
			return date.toISOString();
		} catch {
			return 'Unknown date';
		}
	}
}

/**
 * Converts a date to the user's timezone
 * @param dateInput - The date to convert
 * @param targetTimezone - Optional timezone, defaults to user's local timezone
 * @returns A new Date object in the user's timezone
 */
export function toUserTimezone(
	dateInput: string | number | Date,
	targetTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
): Date {
	try {
		const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
		if (isNaN(date.getTime())) {
			throw new Error('Invalid date');
		}

		// Get the target timezone offset
		const targetDate = new Date(date.toLocaleString('en-US', { timeZone: targetTimezone }));
		const targetOffset = targetDate.getTime() - date.getTime();

		// Create a new date with the adjusted offset
		return new Date(date.getTime() + targetOffset);
	} catch (error) {
		console.error('Error converting date to user timezone:', error);
		return new Date();
	}
}

/**
 * Check if a date is today
 * @param dateInput - The date to check
 * @returns True if the date is today, false otherwise
 */
export function isToday(dateInput: string | number | Date): boolean {
	try {
		const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
		if (isNaN(date.getTime())) {
			return false;
		}

		const today = new Date();
		return (
			date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear()
		);
	} catch {
		return false;
	}
}
