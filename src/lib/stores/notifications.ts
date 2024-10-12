import { get, writable } from 'svelte/store';

export interface Notification {
	message?: string;
	id?: string;
	title?: string;
	feedback?: 'success' | 'danger' | 'warning' | 'default';
	date?: number;
}

export const notifications = writable<Notification[]>(
	typeof window !== 'undefined' ? JSON.parse(localStorage?.getItem('notifications') ?? '[]') : []
);

notifications.subscribe((value) => {
	if (typeof window !== 'undefined') {
		localStorage?.setItem('notifications', JSON.stringify(value));
	}
});

window.addEventListener('storage', () => {
	const storedValueStr = localStorage.getItem('notifications');
	if (storedValueStr == null) {
		notifications.set([]);
		return;
	}

	const localValue = JSON.parse(storedValueStr);
	if (localValue !== get(notifications)) {
		notifications.set(localValue);
	}
});

export function createNotificationObject(notification: Notification): Notification {
	return {
		id: crypto.randomUUID(),
		feedback: 'default',
		date: Date.now(),
		...notification
	};
}

export function createNotifications() {
	const push = (notification: Notification) => {
		notifications.update((value) => {
			const n = createNotificationObject(notification);
			const newValue = [n, ...value];

			return newValue;
		});
	};

	const remove = (id: string) => {
		notifications.update((value) => {
			const newValue = value.filter((notification) => notification.id !== id);

			return newValue;
		});
	};

	return { push, remove };
}
