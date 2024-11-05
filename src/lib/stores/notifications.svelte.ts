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

/**
 * Retrieves the notifications from localStorage.
 *
 * @returns {Notification[]} An array of notifications retrieved from localStorage.
 * If the code is not running in a browser environment or if there is an error
 * during parsing, an empty array is returned.
 *
 * @throws {Error} If there is an issue parsing the data from localStorage.
 */
function getLocalStorage(): Notification[] {
	// Check if the code is running in a browser environment
	if (typeof window !== 'undefined') {
		try {
			// Attempt to get the 'selected' item from localStorage
			const data = localStorage?.getItem('notifications');
			// Parse and return the data if it exists, otherwise return an empty object
			return data ? JSON.parse(data) : {};
		} catch (error) {
			// Log any errors that occur during parsing
			console.error('Error parsing localStorage data:', error);
			return [];
		}
	}
	// Return an empty object if not in a browser environment
	return [];
}

/**
 * Class representing a notifications store.
 */
class Notifications {
	/**
	 * List of notifications, initialized from local storage.
	 */
	list = $state<Notification[]>(getLocalStorage());

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
			this.list = getLocalStorage();
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
