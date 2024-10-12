import { notifications, type Notification } from '$lib/stores/notifications';

export function createNotifications() {
	const push = (notification: Notification) => {
		notifications.update((value) => {
			const newValue = [notification, ...value];

			notification.id = crypto.randomUUID();
			notification.date = Date.now();

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
