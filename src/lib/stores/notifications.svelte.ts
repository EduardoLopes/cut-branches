import { getLocalStorage } from '../utils';

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

/**
 * Creates a new notification object by merging the provided notification
 * with additional default properties.
 *
 * @param {Notification} notification - The notification object to be merged.
 * @returns {Notification} - The newly created notification object with a unique ID, default feedback, and current date.
 */
export function createNotificationObject(notification: Notification): Notification {
	return {
		id: crypto.randomUUID(),
		feedback: 'default',
		date: Date.now(),
		...notification
	};
}

function getNotificationsFromLocalStorage(): Notification[] {
	return getLocalStorage('notifications', []);
}

/**
 * Class representing a notifications store.
 */
export class Notifications {
	/**
	 * List of notifications, initialized from local storage.
	 */
	list = $state<Notification[]>(getNotificationsFromLocalStorage());

	/**
	 * The most recent notification, derived from the list.
	 */
	last = $derived(this.list[0]);

	/**
	 * Constructor for the notifications store.
	 *
	 * Sets up an event listener on the window object to listen for 'storage' events.
	 * When a 'storage' event is detected, it updates the `list` property with the latest data from local storage.
	 */
	constructor() {
		window.addEventListener('storage', () => {
			this.list = getNotificationsFromLocalStorage();
		});
	}

	/**
	 * Adds a new notification to the list and updates the local storage.
	 *
	 * @param {Notification} notification - The notification object to be added.
	 */
	push(notification: Notification) {
		const n = createNotificationObject(notification);
		this.list = [n, ...this.list];
		this.#updateLocalStorage();
	}

	/**
	 * Removes a notification from the list by its ID.
	 *
	 * @param {string} id - The unique identifier of the notification to be removed.
	 */
	remove(id: string) {
		this.list = this.list.filter((notification) => notification.id !== id);
		this.#updateLocalStorage();
	}

	/**
	 * Updates the localStorage with the current notifications state.
	 *
	 * @private
	 */
	#updateLocalStorage() {
		if (typeof window !== 'undefined') {
			try {
				// Set the 'notifications' item in localStorage with the current state
				localStorage?.setItem('notifications', JSON.stringify(this.list));
			} catch (error) {
				// Log any errors that occur during setting localStorage
				console.error('Error setting localStorage data:', error);
			}
		}
	}
}

export const notifications = new Notifications();
