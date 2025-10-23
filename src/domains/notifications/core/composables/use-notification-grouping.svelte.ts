/**
 * @module useNotificationGrouping
 * @description Composable for grouping notifications by date with timezone awareness
 */

import { groupNotificationsByDate } from '../../utils/notification-grouping-utils';
import type { Notification } from '../models/notification';

/**
 * Composable for managing notification grouping state
 * @param props - Configuration options
 * @param props.getNotifications - Getter function that returns the array of notifications
 * @param props.userTimeZone - Optional timezone for grouping dates
 * @param props.enabled - Whether grouping is enabled
 * @returns Grouped notifications and utility functions
 */
export function useNotificationGrouping(props: {
	getNotifications: () => Notification[];
	userTimeZone?: string;
	enabled?: boolean;
}) {
	const {
		getNotifications,
		userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
		enabled = true
	} = props;

	const grouped = $derived(
		enabled ? groupNotificationsByDate(getNotifications(), userTimeZone) : []
	);

	return {
		get grouped() {
			return grouped;
		},
		userTimeZone
	};
}
