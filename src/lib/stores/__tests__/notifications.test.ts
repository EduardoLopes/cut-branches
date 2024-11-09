import {
	notifications,
	type Notification,
	createNotificationObject,
	Notifications
} from '../notifications.svelte';

describe('Notifications Store', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('should create a notification object with default properties', () => {
		const notification = createNotificationObject({ message: 'Test message' });
		expect(notification).toHaveProperty('id');
		expect(notification).toHaveProperty('feedback', 'default');
		expect(notification).toHaveProperty('date');
		expect(notification).toHaveProperty('message', 'Test message');
	});

	it('should initialize with notifications from localStorage', () => {
		const storedNotifications = [
			{ id: '1', message: 'Stored message', feedback: 'success', date: Date.now() }
		];
		localStorage.setItem('notifications', JSON.stringify(storedNotifications));
		const store = new Notifications();
		expect(store.list).toEqual(storedNotifications);
	});

	it('should add a new notification to the list and update localStorage', () => {
		const notification = { message: 'New message' };
		notifications.push(notification);
		expect(notifications.list[0]).toHaveProperty('message', 'New message');
		expect(JSON.parse(localStorage.getItem('notifications')!)[0]).toHaveProperty(
			'message',
			'New message'
		);
	});

	it('should remove a notification from the list by its ID', () => {
		const notification = { message: 'Message to remove' };
		notifications.push(notification);
		const id = notifications.list[0].id;
		if (id) {
			notifications.remove(id);
		}
		expect(notifications.list.find((n) => n.id === id)).toBeUndefined();
		expect(
			JSON.parse(localStorage.getItem('notifications')!).find((n: Notification) => n.id === id)
		).toBeUndefined();
	});

	it('should update the list when a storage event occurs', () => {
		const storedNotifications = [
			{ id: '1', message: 'Stored message', feedback: 'success', date: Date.now() }
		];
		localStorage.setItem('notifications', JSON.stringify(storedNotifications));
		window.dispatchEvent(new Event('storage'));
		expect(notifications.list).toEqual(storedNotifications);
	});
});
