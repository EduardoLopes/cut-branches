/**
 * @module Notification Grouping Utilities
 * @description Domain-specific utilities for grouping notifications
 */

import type { Notification } from '../core/models/notification';
import { groupByDate } from '$utils/array-grouping-utils';

/**
 * Represents a group of notifications for a specific date
 */
export interface NotificationGroup {
	date: Date;
	notifications: Notification[];
}

/**
 * Groups notifications by date in the user's timezone
 * @param notifications - Array of notifications to group
 * @param userTimeZone - User's timezone (defaults to browser timezone)
 * @returns Array of notification groups sorted by date (newest first)
 */
export function groupNotificationsByDate(
	notifications: Notification[],
	userTimeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
): NotificationGroup[] {
	const groups = groupByDate(notifications, (notification) => notification.date, userTimeZone);

	// Transform to match NotificationGroup interface
	return groups.map((group) => ({
		date: group.date,
		notifications: group.items
	}));
}
