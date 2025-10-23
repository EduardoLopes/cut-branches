/**
 * @module Array Grouping Utilities
 * @description Generic utilities for grouping arrays by various criteria
 */

import { formatToUserTimezone, toUserTimezone } from './date-utils';
import { isValidDate } from './validation-utils';

/**
 * Represents a group of items by date
 */
export interface DateGroup<T> {
	date: Date;
	items: T[];
}

/**
 * Generic function to group items by date in the user's timezone
 * @param items - Array of items to group
 * @param getDate - Function to extract the date from each item
 * @param userTimeZone - User's timezone (defaults to browser timezone)
 * @returns Array of date groups sorted by date (newest first)
 */
export function groupByDate<T>(
	items: T[],
	getDate: (item: T) => number | Date | null | undefined,
	userTimeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
): DateGroup<T>[] {
	try {
		// Group by date in user's timezone
		const groups: Record<string, T[]> = {};

		items.forEach((item) => {
			const date = getDate(item);
			if (!date || !isValidDate(date)) return;

			// Use our toUserTimezone utility to handle timezone conversion
			const userTimezoneDate = toUserTimezone(date, userTimeZone);
			// Format the date for grouping
			const dateKey = formatToUserTimezone(userTimezoneDate, 'yyyy-MM-dd', userTimeZone);

			if (!groups[dateKey]) {
				groups[dateKey] = [];
			}

			groups[dateKey].push(item);
		});

		// Convert to array of objects with date and items
		return Object.entries(groups)
			.map(([dateKey, groupItems]) => ({
				// Use our toUserTimezone utility to create the date object
				date: toUserTimezone(dateKey, userTimeZone),
				items: groupItems
			}))
			.sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date, newest first
	} catch (error) {
		console.error('Error grouping items by date:', error);
		return [];
	}
}

/**
 * Generic function to group items by a key extractor function
 * @param items - Array of items to group
 * @param getKey - Function to extract the grouping key from each item
 * @returns Record of grouped items by key
 */
export function groupBy<T, K extends string | number>(
	items: T[],
	getKey: (item: T) => K
): Record<K, T[]> {
	return items.reduce(
		(groups, item) => {
			const key = getKey(item);
			if (!groups[key]) {
				groups[key] = [];
			}
			groups[key].push(item);
			return groups;
		},
		{} as Record<K, T[]>
	);
}
