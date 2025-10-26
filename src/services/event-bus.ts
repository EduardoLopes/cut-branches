/**
 * Global Event Bus
 *
 * Provides a publish-subscribe mechanism for inter-domain communication.
 * Domains can publish events without knowing who will consume them,
 * and subscribe to events without knowing who publishes them.
 *
 * This ensures domains remain decoupled and independent.
 */

type EventCallback<T = unknown> = (data: T) => void;

interface EventSubscription {
	unsubscribe: () => void;
}

class EventBus {
	private listeners: Map<string, Set<EventCallback>> = new Map();

	/**
	 * Subscribe to an event
	 * @param event - The event name to listen for
	 * @param callback - Function to call when event is published
	 * @returns Subscription object with unsubscribe method
	 */
	subscribe<T = unknown>(event: string, callback: EventCallback<T>): EventSubscription {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}

		const callbacks = this.listeners.get(event)!;
		callbacks.add(callback as EventCallback);

		return {
			unsubscribe: () => {
				callbacks.delete(callback as EventCallback);
				if (callbacks.size === 0) {
					this.listeners.delete(event);
				}
			}
		};
	}

	/**
	 * Publish an event to all subscribers
	 * @param event - The event name to publish
	 * @param data - Optional data to pass to subscribers
	 */
	publish<T = unknown>(event: string, data?: T): void {
		const callbacks = this.listeners.get(event);
		if (callbacks) {
			callbacks.forEach((callback) => {
				try {
					callback(data);
				} catch (error) {
					console.error(`Error in event listener for "${event}":`, error);
				}
			});
		}
	}

	/**
	 * Remove all listeners for a specific event
	 * @param event - The event name to clear
	 */
	clear(event: string): void {
		this.listeners.delete(event);
	}

	/**
	 * Remove all listeners for all events
	 */
	clearAll(): void {
		this.listeners.clear();
	}
}

// Export singleton instance
export const eventBus = new EventBus();

// Export event names as constants to avoid typos
export const Events = {
	REPOSITORY_ADD_REQUESTED: 'repository:add:requested',
	REPOSITORY_ADDING: 'repository:adding',
	REPOSITORY_ADDED: 'repository:added',
	REPOSITORY_ADD_FAILED: 'repository:add:failed',
	REPOSITORY_REMOVED: 'repository:removed',
	REPOSITORY_DELETED: 'repository:deleted',
	REPOSITORY_UPDATED: 'repository:updated',
	BRANCH_DELETED: 'branch:deleted',
	BRANCH_RESTORED: 'branch:restored'
} as const;
