import { z } from 'zod/v4';
import { Notification, type NotificationData } from '../core/models/notification';
import { MapStore } from '$utils/map-store.svelte';

// Define schema for notification data objects that transforms to Notification instances
const notificationSchema = z
	.object({
		message: z.string().optional(),
		id: z.string().optional(),
		title: z.string().optional(),
		feedback: z.enum(['success', 'danger', 'warning', 'default']).optional(),
		date: z.number().nullable().optional()
	})
	.transform((data) => Notification.create(data));

/**
 * Store for managing notifications using the Notification Value Object
 */
export class NotificationStore extends MapStore<string, Notification> {
	constructor(repository: string) {
		super(repository, z.string(), notificationSchema, []);
	}

	/**
	 * Gets the last notification in the list
	 */
	get last(): Notification | undefined {
		return this.list[this.list.length - 1];
	}

	/**
	 * Adds a notification without requiring a key.
	 * Creates a Notification Value Object from the provided data.
	 *
	 * @param data - The notification data to be added.
	 */
	push(data: NotificationData) {
		const notification = Notification.create(data);
		super.set(notification.id, notification);
	}

	/**
	 * Overrides the set method to ensure we're working with Notification instances
	 */
	override set(key: string, value: Notification | NotificationData) {
		const notification = Notification.isNotification(value) ? value : Notification.create(value);
		super.set(key, notification);
	}
}

/**
 * Global notification store instance
 */
export const notifications = new NotificationStore('notifications');

// Re-export types and classes for convenience
export {
	Notification,
	NotificationValidationError,
	type NotificationData
} from '../core/models/notification';
