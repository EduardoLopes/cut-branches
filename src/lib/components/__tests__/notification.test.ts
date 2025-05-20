import { render, fireEvent } from '@testing-library/svelte';
import { vi, describe, expect, test, beforeEach } from 'vitest';
import Notification from '../notification.svelte';
import { notifications } from '$lib/stores/notifications.svelte';

// Mock the debounce function to execute immediately
vi.mock('$lib/utils/svelte-runes-utils', () => ({
	debounce: vi.fn((fn) => fn)
}));

// Mock notifications store
vi.mock('$lib/stores/notifications.svelte', () => ({
	notifications: {
		delete: vi.fn()
	}
}));

describe('Notification Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('renders with title', () => {
		const { getByText } = render(Notification, {
			props: {
				title: 'Test Title',
				message: 'Test Message',
				feedback: 'success'
			}
		});

		expect(getByText('Test Title')).toBeInTheDocument();
	});

	test('renders with message', () => {
		const { getByText } = render(Notification, {
			props: {
				message: 'Test Message',
				feedback: 'success'
			}
		});

		expect(getByText('Test Message')).toBeInTheDocument();
	});

	test('renders with feedback', () => {
		const { container } = render(Notification, {
			props: {
				message: 'Test Message',
				feedback: 'success'
			}
		});

		// Look for an Alert element that would contain the feedback class
		const alertElement = container.querySelector('div');
		expect(alertElement).toHaveClass('color-palette_success');
	});

	test('renders date when provided', () => {
		const testDate = Date.now();
		const { container } = render(Notification, {
			props: {
				message: 'Test Message',
				feedback: 'success',
				date: testDate
			}
		});

		const timeElement = container.querySelector('time');
		expect(timeElement).toBeInTheDocument();

		const alertElement = container.querySelector('div');
		expect(alertElement).toHaveClass('color-palette_success');
	});

	test('does not render date when not provided', () => {
		const { container } = render(Notification, {
			props: {
				message: 'Test Message',
				feedback: 'success'
			}
		});

		const timeElement = container.querySelector('time');
		expect(timeElement).not.toBeInTheDocument();
	});

	test('calls notifications.delete when close button is clicked', async () => {
		const { container } = render(Notification, {
			props: {
				id: '123',
				message: 'Test Message',
				feedback: 'success'
			}
		});

		// Find the close button
		const closeButton = container.querySelector('button');
		expect(closeButton).toBeInTheDocument();

		// Click the close button
		if (closeButton) {
			await fireEvent.click(closeButton);
		}

		// Check if notifications.delete was called with the correct ID
		expect(notifications.delete).toHaveBeenCalledWith(['123']);
	});

	test('does not render close button when id is not provided', () => {
		const { container } = render(Notification, {
			props: {
				message: 'Test Message',
				feedback: 'success'
			}
		});

		// Check that there is no close button
		const closeButton = container.querySelector('button');
		expect(closeButton).not.toBeInTheDocument();
	});
});
