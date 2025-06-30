import { intlFormatDistance, intlFormat } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	safeFormatDate,
	safeFormatRelativeDate,
	formatToUserTimezone,
	formatDateDetailed,
	safeFormatDateDetailed,
	toUserTimezone,
	isToday
} from '../date-utils';
import { formatDate } from '../format-date';

vi.mock('date-fns', () => ({
	intlFormatDistance: vi.fn(),
	intlFormat: vi.fn()
}));

vi.mock('date-fns-tz', () => ({
	formatInTimeZone: vi.fn()
}));

vi.mock('../format-date', () => ({
	formatDate: vi.fn()
}));

describe('date-utils', () => {
	const invalidDateStr = 'not-a-date';

	beforeEach(() => {
		// Reset mocks before each test
		vi.resetAllMocks();

		// Set up mock return values
		vi.mocked(formatDate).mockReturnValue('Monday, May 15th, 2023 at 12:30:00 PM');
		vi.mocked(intlFormatDistance).mockReturnValue('2 days ago');
		vi.mocked(formatInTimeZone).mockReturnValue('2023-05-15');
		vi.mocked(intlFormat).mockReturnValue('May 15, 2023, 12:30:00 PM');

		// Mock Date.now() to return a fixed date for consistent testing
		vi.spyOn(Date, 'now').mockReturnValue(new Date('2023-05-17T12:30:00Z').getTime());
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('safeFormatDate', () => {
		it('should format a valid date using formatDate', () => {
			const result = safeFormatDate('2023-05-15T12:30:00Z');

			expect(formatDate).toHaveBeenCalledTimes(1);
			expect(formatDate).toHaveBeenCalledWith(expect.any(Date));
			expect(result).toBe('Monday, May 15th, 2023 at 12:30:00 PM');
		});

		it('should return "Unknown date" for invalid dates', () => {
			const result = safeFormatDate(invalidDateStr);

			expect(formatDate).not.toHaveBeenCalled();
			expect(result).toBe('Unknown date');
		});
	});

	describe('safeFormatRelativeDate', () => {
		it('should format a valid date using intlFormatDistance', () => {
			const result = safeFormatRelativeDate('2023-05-15T12:30:00Z');

			expect(intlFormatDistance).toHaveBeenCalledTimes(1);
			expect(intlFormatDistance).toHaveBeenCalledWith(
				expect.any(Date),
				expect.any(Number),
				undefined
			);
			expect(result).toBe('2 days ago');
		});

		it('should pass options to intlFormatDistance', () => {
			const options = { unit: 'month' as const };
			safeFormatRelativeDate('2023-05-15T12:30:00Z', options);

			expect(intlFormatDistance).toHaveBeenCalledWith(
				expect.any(Date),
				expect.any(Number),
				options
			);
		});

		it('should return "Unknown" for invalid dates', () => {
			const result = safeFormatRelativeDate(invalidDateStr);

			expect(intlFormatDistance).not.toHaveBeenCalled();
			expect(result).toBe('Unknown');
		});
	});

	describe('formatToUserTimezone', () => {
		it('should format a date in the user timezone', () => {
			const date = new Date('2023-05-15T12:30:00Z');
			const format = 'yyyy-MM-dd';
			const timezone = 'America/New_York';

			const result = formatToUserTimezone(date, format, timezone);

			expect(formatInTimeZone).toHaveBeenCalledTimes(1);
			expect(formatInTimeZone).toHaveBeenCalledWith(date, timezone, format);
			expect(result).toBe('2023-05-15');
		});

		it('should use default format and timezone when not provided', () => {
			const date = new Date('2023-05-15T12:30:00Z');
			const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

			formatToUserTimezone(date);

			expect(formatInTimeZone).toHaveBeenCalledWith(date, defaultTimezone, 'yyyy-MM-dd');
		});

		it('should fallback to ISO date string on error', () => {
			const date = new Date('2023-05-15T12:30:00Z');

			// Make formatInTimeZone throw an error
			vi.mocked(formatInTimeZone).mockImplementation(() => {
				throw new Error('Timezone error');
			});

			const result = formatToUserTimezone(date);

			expect(result).toBe('2023-05-15');
		});
	});

	describe('formatDateDetailed', () => {
		it('should format a date with detailed options', () => {
			const date = new Date('2023-05-15T12:30:00Z');

			const result = formatDateDetailed(date);

			expect(intlFormat).toHaveBeenCalledTimes(1);
			expect(intlFormat).toHaveBeenCalledWith(date, {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: 'numeric',
				minute: 'numeric',
				second: 'numeric'
			});
			expect(result).toBe('May 15, 2023, 12:30:00 PM');
		});

		it('should fallback to ISO string on error', () => {
			const date = new Date('2023-05-15T12:30:00Z');

			// Make intlFormat throw an error
			vi.mocked(intlFormat).mockImplementation(() => {
				throw new Error('Format error');
			});

			const result = formatDateDetailed(date);

			expect(result).toBe('2023-05-15T12:30:00.000Z');
		});
	});

	describe('safeFormatDateDetailed', () => {
		it('should format a valid date with detailed options', () => {
			const date = new Date('2023-05-15T12:30:00Z');

			const result = safeFormatDateDetailed(date);

			expect(intlFormat).toHaveBeenCalledTimes(1);
			expect(intlFormat).toHaveBeenCalledWith(date, {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: 'numeric',
				minute: 'numeric',
				second: 'numeric'
			});
			expect(result).toBe('May 15, 2023, 12:30:00 PM');
		});

		it('should return "Unknown date" for invalid dates', () => {
			const result = safeFormatDateDetailed(invalidDateStr);

			expect(intlFormat).not.toHaveBeenCalled();
			expect(result).toBe('Unknown date');
		});

		it('should fallback to ISO string on error', () => {
			const date = new Date('2023-05-15T12:30:00Z');

			// Make intlFormat throw an error
			vi.mocked(intlFormat).mockImplementation(() => {
				throw new Error('Format error');
			});

			const result = safeFormatDateDetailed(date);

			expect(result).toBe('2023-05-15T12:30:00.000Z');
		});
	});

	describe('toUserTimezone', () => {
		it('should convert a date to the user timezone', () => {
			const date = new Date('2023-05-15T12:30:00Z');
			const timezone = 'America/New_York';

			// Mock toLocaleString to simulate timezone conversion
			const mockDate = new Date('2023-05-15T08:30:00Z'); // 4 hours behind UTC
			const originalToLocaleString = Date.prototype.toLocaleString;
			Date.prototype.toLocaleString = vi.fn().mockReturnValue(mockDate.toString());

			const result = toUserTimezone(date, timezone);

			expect(Date.prototype.toLocaleString).toHaveBeenCalledWith('en-US', { timeZone: timezone });
			expect(result).toBeInstanceOf(Date);

			// Restore the original method
			Date.prototype.toLocaleString = originalToLocaleString;
		});

		it('should handle invalid dates', () => {
			const result = toUserTimezone(invalidDateStr);

			expect(result).toBeInstanceOf(Date);
			expect(result.toString()).not.toBe('Invalid Date');
		});

		it('should handle errors and return a new Date', () => {
			const date = new Date('2023-05-15T12:30:00Z');

			// Mock toLocaleString to throw an error
			const originalToLocaleString = Date.prototype.toLocaleString;
			Date.prototype.toLocaleString = vi.fn().mockImplementation(() => {
				throw new Error('Timezone error');
			});

			const result = toUserTimezone(date);

			expect(result).toBeInstanceOf(Date);
			expect(result.toString()).not.toBe('Invalid Date');

			// Restore the original method
			Date.prototype.toLocaleString = originalToLocaleString;
		});
	});

	describe('isToday', () => {
		let realDate: DateConstructor;

		beforeEach(() => {
			// Save the original Date constructor
			realDate = global.Date;
		});

		afterEach(() => {
			// Restore the original Date constructor
			global.Date = realDate;
			vi.restoreAllMocks();
		});

		it('should return true when date is today', () => {
			// Setup a mock date implementation for "today"
			const mockToday = new Date('2023-05-17');
			global.Date = class extends realDate {
				constructor() {
					super();
					return mockToday;
				}
			} as DateConstructor;
			global.Date.now = () => mockToday.getTime();
			global.Date.parse = realDate.parse;
			global.Date.UTC = realDate.UTC;

			// Use the same date as our mock "today"
			const result = isToday(mockToday);

			expect(result).toBe(true);
		});

		it('should return false when date is not today', () => {
			// Instead of creating a new Date, let's directly spy on the Date.prototype methods
			// to control the comparison in isToday

			// First create spies for the methods used in the comparison
			const getDateSpy = vi.spyOn(Date.prototype, 'getDate');
			const getMonthSpy = vi.spyOn(Date.prototype, 'getMonth');
			const getFullYearSpy = vi.spyOn(Date.prototype, 'getFullYear');

			// For the date being tested, return Jan 1, 2000
			getDateSpy.mockReturnValueOnce(1); // The input date's day
			getMonthSpy.mockReturnValueOnce(0); // The input date's month (January)
			getFullYearSpy.mockReturnValueOnce(2000); // The input date's year

			// For "today" that's created inside isToday, return Dec 31, 2022
			getDateSpy.mockReturnValueOnce(31); // Today's day
			getMonthSpy.mockReturnValueOnce(11); // Today's month (December)
			getFullYearSpy.mockReturnValueOnce(2022); // Today's year

			// Now call isToday with any date, the spies will control the values
			const result = isToday(new Date());

			expect(result).toBe(false);

			// Clean up
			getDateSpy.mockRestore();
			getMonthSpy.mockRestore();
			getFullYearSpy.mockRestore();
		});

		it('should return false for invalid dates', () => {
			// No need to mock Date for this test, just spy on getTime
			const dateSpy = vi.spyOn(Date.prototype, 'getTime').mockImplementation(() => {
				throw new Error('Invalid date');
			});

			const result = isToday(invalidDateStr);

			expect(result).toBe(false);
			dateSpy.mockRestore();
		});

		it('should return false when an error occurs', () => {
			// Create a spy for console.error to suppress output
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Mock getTime to throw after initial check
			const date = new Date('2023-05-15');
			const getTimeSpy = vi.spyOn(Date.prototype, 'getTime');

			// First call passes (in isNaN check)
			getTimeSpy.mockReturnValueOnce(date.valueOf());

			// Then make it throw on next call
			getTimeSpy.mockImplementationOnce(() => {
				throw new Error('Test error');
			});

			const result = isToday(date);

			expect(result).toBe(false);

			// Cleanup
			getTimeSpy.mockRestore();
			consoleErrorSpy.mockRestore();
		});

		it('should properly handle errors', () => {
			// Create a direct wrapper around the isToday function
			// that we know will throw an error at a place where it will hit the catch block

			// Simulate a Date object that will throw when its methods are called
			// after passing the initial getTime check
			const brokenObj = {
				getTime: () => Date.now(), // Pass the isNaN check
				getDate: () => {
					throw new Error('Test error');
				}, // Throw on comparison
				getMonth: () => 0,
				getFullYear: () => 2023,
				// Make it look like a Date to the instanceof check
				constructor: Date
			};

			// Pass our broken object directly to isToday
			// This should hit the catch block
			const result = isToday(brokenObj as unknown as Date);

			// The function should catch the error and return false
			expect(result).toBe(false);
		});
	});
});
