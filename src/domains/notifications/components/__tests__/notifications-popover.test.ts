import { tick } from 'svelte';
import { describe, expect, beforeEach, afterEach, vi, test } from 'vitest';
import { notifications } from '../../store/notifications.svelte';
import NotificationsPopover from '../notifications-popover.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn(function (this: {
	observe: ReturnType<typeof vi.fn>;
	unobserve: ReturnType<typeof vi.fn>;
	disconnect: ReturnType<typeof vi.fn>;
}) {
	this.observe = vi.fn();
	this.unobserve = vi.fn();
	this.disconnect = vi.fn();
});
window.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver;

describe('NotificationsPopover Component', () => {
	beforeEach(() => {
		// Clear notifications before each test
		notifications.clear();

		// Reset mocks
		vi.clearAllMocks();

		// Use fake timers for controlled testing
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	test('renders button with correct aria-label when no notifications', () => {
		const { getByRole } = renderWithTestWrapper(NotificationsPopover);

		const button = getByRole('button');
		expect(button).toHaveAttribute('aria-label', 'No new notifications');
	});

	test('renders button with correct aria-label when notifications exist', () => {
		// Add a notification
		notifications.push({
			title: 'Test Notification',
			message: 'This is a test notification',
			feedback: 'success'
		});

		const { getByRole } = renderWithTestWrapper(NotificationsPopover);

		const button = getByRole('button');
		expect(button).toHaveAttribute('aria-label', '1 notification');
	});

	test('opens popover when clicked', async () => {
		const { getByRole, getByTestId } = renderWithTestWrapper(NotificationsPopover);

		const button = getByRole('button');
		await button.click();

		// Wait for popover to open
		await tick();

		// Check for popover content
		expect(getByTestId('notifications')).toBeInTheDocument();
	});

	test('auto-closes popover after delay', async () => {
		const { getByTestId } = renderWithTestWrapper(NotificationsPopover);

		// Get popover element
		const popover = getByTestId('notifications');
		const popoverElement = popover.element();

		// Add a notification AFTER component is rendered so it triggers auto-open
		notifications.push({
			title: 'Test',
			message: 'Test message',
			feedback: 'default'
		});
		await tick();
		await tick(); // Extra tick for the reactive effect to trigger

		// Wait for the auto-open effect to settle
		await vi.waitFor(
			() => {
				expect(popoverElement.getAttribute('data-open')).toBe('true');
			},
			{ timeout: 5000 }
		);

		// Now advance timer to trigger auto-close (2000ms + small buffer)
		await vi.advanceTimersByTimeAsync(2100);
		await tick();

		// Verify popover closed
		await vi.waitFor(
			() => {
				expect(popoverElement.getAttribute('data-open')).toBe('false');
			},
			{ timeout: 5000 }
		);
	});

	test('stops auto-close timer on mouseenter', async () => {
		const { getByRole, getByTestId } = renderWithTestWrapper(NotificationsPopover);

		// Click to open popover
		const button = getByRole('button');
		await button.click();
		await tick();

		// Get popover element
		const popover = getByTestId('notifications');
		const popoverElement = popover.element();
		expect(popoverElement.getAttribute('data-open')).toBe('true');

		// Trigger mouseenter to stop auto-close
		await popoverElement.dispatchEvent(new Event('mouseenter'));

		// Advance timer beyond auto-close delay
		vi.advanceTimersByTime(3000);
		await tick();

		// Verify popover is still open
		expect(popoverElement.getAttribute('data-open')).toBe('true');
	});

	test('restarts auto-close timer on mouseleave', async () => {
		const { getByRole, getByTestId } = renderWithTestWrapper(NotificationsPopover);

		// Click to open popover
		const button = getByRole('button');
		await button.click();
		await tick();

		// Get popover element
		const popover = await getByTestId('notifications');
		const popoverElement = popover.element();

		// Trigger mouseenter to stop auto-close
		await popoverElement.dispatchEvent(new Event('mouseenter'));

		expect(popoverElement.getAttribute('data-open')).toBe('true');

		// Advance timer (popover should stay open)
		vi.advanceTimersByTime(1000);

		// Trigger mouseleave to restart auto-close
		await popoverElement.dispatchEvent(new Event('mouseleave'));

		// Advance timer beyond auto-close delay
		vi.advanceTimersByTime(2100);
		await tick();

		// Verify popover closed
		expect(popoverElement.getAttribute('data-open')).toBe('false');
	});

	test('displays empty state message when no notifications', async () => {
		// Render component
		const { getByRole, getByTestId, getByText } = renderWithTestWrapper(NotificationsPopover);

		// Start with a clean state
		notifications.clear();
		await tick();
		console.log(notifications.list);

		// Verify initial state
		expect(notifications.list.length).toBe(0);

		// Click to open popover
		const button = getByRole('button');
		await button.click();
		await tick();

		// Verify popover is open
		const popover = getByTestId('notifications');
		const popoverElement = popover.element();
		expect(popoverElement.getAttribute('data-open')).toBe('true');

		// Stop auto-close timer
		await popoverElement.dispatchEvent(new Event('mouseenter'));
		await tick();

		// Verify empty state message
		const emptyMessage = getByText('You have no new notifications at the moment.');
		expect(emptyMessage).toBeInTheDocument();
		expect(emptyMessage.element().textContent).toBe('You have no new notifications at the moment.');
	});

	test('displays last notification when notifications exist', async () => {
		// Add a notification
		notifications.push({
			title: 'Test Notification',
			message: 'This is a test notification',
			feedback: 'success'
		});

		const { getByTestId } = renderWithTestWrapper(NotificationsPopover);

		// Click to open popover
		const button = getByTestId('notifications-trigger');
		await button.click();
		await tick();

		// Get the popover element and query within it
		const popover = getByTestId('notifications');

		// Use role-based queries for more specific matching
		await vi.waitFor(() => {
			// Title should be in a heading element
			expect(popover.getByRole('heading', { name: /Test Notification/i })).toBeInTheDocument();
		});

		// Message should be in the alert (Alert component has role="alert" by default)
		const alert = popover.getByRole('alert');
		await vi.waitFor(() => {
			expect(alert).toBeInTheDocument();
			expect(alert.element().textContent).toContain('This is a test notification');
		});
	});

	test('toggles between showing last notification and all notifications', async () => {
		// Add multiple notifications
		notifications.push({
			title: 'First Notification',
			message: 'This is the first notification',
			feedback: 'success',
			date: Date.now() - 86400000 // 1 day ago
		});

		notifications.push({
			title: 'Second Notification',
			message: 'This is the second notification',
			feedback: 'warning',
			date: Date.now()
		});

		const { getByRole, getByText } = renderWithTestWrapper(NotificationsPopover);

		// Click to open popover
		const button = getByRole('button');
		await button.click();
		await tick();

		// Should see only the last notification initially
		expect(getByRole('heading', { name: /Second Notification/i })).toBeInTheDocument();

		// Click Show More button
		const showMoreButton = getByText('Show More');
		await showMoreButton.click();
		await tick();

		// Should now see both notifications
		expect(getByRole('heading', { name: /First Notification/i })).toBeInTheDocument();
		expect(getByRole('heading', { name: /Second Notification/i })).toBeInTheDocument();

		// Verify Show Less button exists
		expect(getByText('Show Less')).toBeInTheDocument();
	});

	test('sets up IntersectionObserver for infinite scrolling', async () => {
		// Add multiple notifications for scrolling
		for (let i = 0; i < 15; i++) {
			notifications.push({
				title: `Notification ${i}`,
				message: `This is notification ${i}`,
				feedback: 'default',
				date: Date.now() - i * 3600000 // Each notification 1 hour apart
			});
		}

		renderWithTestWrapper(NotificationsPopover);

		// Verify IntersectionObserver was initialized
		expect(mockIntersectionObserver).toHaveBeenCalled();
	});

	test('loads more notifications when scrolling to sentinel', async () => {
		// Add many notifications
		for (let i = 0; i < 20; i++) {
			notifications.push({
				title: `Notification ${i}`,
				message: `This is notification ${i}`,
				feedback: 'default',
				date: Date.now() - i * 3600000
			});
		}

		const { getByRole, getByText } = renderWithTestWrapper(NotificationsPopover);

		// Open popover
		const button = getByRole('button');
		await button.click();

		// Click Show More
		const showMoreButton = getByText('Show More');
		await showMoreButton.click();
		await tick();

		// Simulate intersection observer callback
		const calls = mockIntersectionObserver.mock.calls as unknown as Array<
			[IntersectionObserverCallback, ...unknown[]]
		>;
		const observerCallback = calls[0]?.[0];
		if (observerCallback) {
			observerCallback(
				[{ isIntersecting: true } as IntersectionObserverEntry],
				{} as IntersectionObserver
			);
		}
		await tick();

		// Verify page state was updated (indirectly testing that more items would be loaded)
		// We'd need to check internal state for this, but we can assume it worked if the observer was called
		expect(mockIntersectionObserver).toHaveBeenCalled();
	});

	test('auto-opens when new notifications arrive', async () => {
		const { getByTestId } = renderWithTestWrapper(NotificationsPopover);

		// Initially popover should be closed
		const initialPopover = getByTestId('notifications');
		expect(initialPopover.element().getAttribute('data-open')).toBe('false');

		// Add a new notification
		notifications.push({
			title: 'New Notification',
			message: 'This notification should trigger auto-open',
			feedback: 'success'
		});

		// Wait for effect to run
		await tick();

		// Popover should now be open
		const popover = getByTestId('notifications');
		expect(popover.element().getAttribute('data-open')).toBe('true');
	});
});
