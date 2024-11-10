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
});

describe('NotificationStore', () => {
	it('should add a notification with a unique ID', () => {
		const store = new NotificationStore('notifications');
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
});
