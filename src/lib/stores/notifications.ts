import { get, writable } from 'svelte/store';

export interface Notification {
	id?: string;
	title: string;
	message: string;
	feedback: 'success' | 'danger' | 'warning' | 'default';
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
