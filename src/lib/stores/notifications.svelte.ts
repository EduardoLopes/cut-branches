import { z } from 'zod/v4';
import { MapStore } from '$lib/utils/map-store.svelte';

/**
 * Represents a notification object.
 */
export interface Notification {
	/**
	 * The message content of the notification.
	 */
	message?: string;

	/**
	 * The unique identifier for the notification.
	 */
	id?: string;

	/**
	 * The title of the notification.
	 */
	title?: string;

	/**
	 * The type of feedback associated with the notification.
	 * Can be one of 'success', 'danger', 'warning', or 'default'.
	 */
	feedback?: 'success' | 'danger' | 'warning' | 'default';

	/**
	 * The timestamp when the notification was created.
	 */
	date?: number;
}

// Define schema for notification objects
const notificationSchema = z.object({
	message: z.string().optional(),
	id: z.string().optional(),
	title: z.string().optional(),
	feedback: z.enum(['success', 'danger', 'warning', 'default']).optional(),
	date: z.number().optional()
});

/**
 * Creates a new notification object by merging the provided notification
 * with additional default properties.
 *
 * @param {Notification} notification - The notification object to be merged.
 * @returns {Notification} - The newly created notification object with a unique ID, default feedback, and current date.
 */
export function createNotificationObject(notification: Notification): Notification {
	return {
		id: notification.id || crypto.randomUUID(),
		feedback: 'default',
		date: Date.now(),
		...notification
	};
}

export class NotificationStore extends MapStore<string, Notification> {
	constructor(repository: string) {
		super(repository, z.string(), notificationSchema, []);
	}

	get last() {
		return this.list[this.list.length - 1];
	}

	/**
	 * Adds a notification without requiring a key.
	 *
	 * @param {Notification} value - The notification object to be added.
	 */
	push(value: Notification) {
		const notification = createNotificationObject(value);
		super.set(notification.id!, notification);
	}
}

export function isNotification(value: unknown): value is Notification {
	return typeof value === 'object' && value !== null && 'message' in value;
}

export function getNotification(value: unknown): Notification {
	if (isNotification(value)) {
		return value;
	}

	// Handle case where value is not a proper Notification
	return {
		message:
			typeof value === 'object' && value !== null && 'message' in value
				? String(value.message)
				: 'Unknown error'
	};
}

export const notifications = new NotificationStore('notifications');
