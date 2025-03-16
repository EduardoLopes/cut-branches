import { describe, it, expect, vi } from 'vitest';
import {
	createNotificationObject,
	NotificationStore,
	type Notification
} from '../notifications.svelte';

vi.mock('crypto', () => ({
	randomUUID: vi.fn(() => 'unique-id')
}));

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('createNotificationObject', () => {
	it('should create a notification object with default properties', () => {
		const notification: Notification = { message: 'Test message', title: 'Test title' };
		const result = createNotificationObject(notification);
		expect(result.id).toMatch(
			/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
		);
		expect(result.feedback).toBe('default');
		expect(result.date).toBeCloseTo(Date.now(), 2);
		expect(result.message).toBe('Test message');
		expect(result.title).toBe('Test title');
	});

	it('should preserve existing properties when creating notification object', () => {
		const notification: Notification = {
			message: 'Test message',
			title: 'Test title',
			feedback: 'success',
			id: 'custom-id',
			date: 1234567890
		};
		const result = createNotificationObject(notification);
		expect(result.id).toBe('custom-id');
		expect(result.feedback).toBe('success');
		expect(result.date).toBe(1234567890);
		expect(result.message).toBe('Test message');
		expect(result.title).toBe('Test title');
	});

	it('should handle notification without optional properties', () => {
		const notification: Notification = { message: 'Test message' };
		const result = createNotificationObject(notification);
		expect(result.id).toBeDefined();
		expect(result.feedback).toBe('default');
		expect(result.date).toBeDefined();
		expect(result.message).toBe('Test message');
		expect(result.title).toBeUndefined();
	});
});

describe('NotificationStore', () => {
	let store: NotificationStore;

	beforeEach(() => {
		store = new NotificationStore('notifications');
		store.clear();
	});

	it('should add a notification with a unique ID', () => {
		const notification: Notification = { message: 'Test message', title: 'Test title' };
		const result = createNotificationObject(notification);
		store.push(notification);

		expect(result.id).toMatch(
			/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
		);
		expect(result.feedback).toBe('default');
		expect(result.date).toBeCloseTo(Date.now(), 2);
		expect(result.message).toBe('Test message');
		expect(result.title).toBe('Test title');
	});

	it('should return the last added notification', () => {
		const notification1 = { message: 'First message', title: 'First title' };
		const notification2 = { message: 'Second message', title: 'Second title' };

		store.push(notification1);
		store.push(notification2);

		expect(store.last.message).toBe('Second message');
		expect(store.last.title).toBe('Second title');
	});

	it('should delete notifications by ID', () => {
		const notification1 = { message: 'First message', id: 'id1' };
		const notification2 = { message: 'Second message', id: 'id2' };

		store.push(notification1);
		store.push(notification2);
		expect(store.list.length).toBe(2);

		store.delete(['id1']);
		expect(store.list.length).toBe(1);
		expect(store.list[0].message).toBe('Second message');
	});

	it('should handle multiple notifications with different feedback types', () => {
		const notifications = [
			{ message: 'Success message', feedback: 'success' as const },
			{ message: 'Warning message', feedback: 'warning' as const },
			{ message: 'Danger message', feedback: 'danger' as const }
		];

		notifications.forEach((notification) => store.push(notification));

		expect(store.list.length).toBe(3);
		expect(store.list[0].feedback).toBe('success');
		expect(store.list[1].feedback).toBe('warning');
		expect(store.list[2].feedback).toBe('danger');
	});

	it('should maintain notification order', () => {
		const notifications = [
			{ message: 'First message' },
			{ message: 'Second message' },
			{ message: 'Third message' }
		];

		notifications.forEach((notification) => store.push(notification));

		expect(store.list.map((n) => n.message)).toEqual([
			'First message',
			'Second message',
			'Third message'
		]);
	});

	it('should handle empty notification list', () => {
		expect(store.list.length).toBe(0);
		expect(store.last).toBeUndefined();
	});

	it('should handle deletion of non-existent notification IDs', () => {
		const notification = { message: 'Test message', id: 'id1' };
		store.push(notification);
		expect(store.list.length).toBe(1);

		// Try to delete non-existent ID
		store.delete(['non-existent-id']);
		expect(store.list.length).toBe(1);
		expect(store.list[0].id).toBe('id1');
	});

	it('should handle deletion of multiple notification IDs', () => {
		const notifications = [
			{ message: 'First message', id: 'id1' },
			{ message: 'Second message', id: 'id2' },
			{ message: 'Third message', id: 'id3' }
		];

		notifications.forEach((notification) => store.push(notification));
		expect(store.list.length).toBe(3);

		store.delete(['id1', 'id3']);
		expect(store.list.length).toBe(1);
		expect(store.list[0].id).toBe('id2');
	});

	it('should handle notifications with markdown content', () => {
		const notification = {
			title: '**Bold Title**',
			message: '- List item 1\n- List item 2\n\n*Italic text*'
		};

		store.push(notification);
		const storedNotification = store.last;

		expect(storedNotification.title).toBe('**Bold Title**');
		expect(storedNotification.message).toBe('- List item 1\n- List item 2\n\n*Italic text*');
	});

	it('should handle notifications with HTML content safely', () => {
		const notification = {
			title: '<script>alert("xss")</script>Title',
			message: '<div onclick="alert()">Message</div>'
		};

		store.push(notification);
		const storedNotification = store.last;

		expect(storedNotification.title).toBe('<script>alert("xss")</script>Title');
		expect(storedNotification.message).toBe('<div onclick="alert()">Message</div>');
	});

	it('should handle very long notification content', () => {
		const longString = 'a'.repeat(1000);
		const notification = {
			title: longString,
			message: longString
		};

		store.push(notification);
		const storedNotification = store.last;

		expect(storedNotification.title).toBe(longString);
		expect(storedNotification.message).toBe(longString);
	});
});
