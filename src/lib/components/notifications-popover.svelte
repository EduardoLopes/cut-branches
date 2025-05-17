<script lang="ts">
	/**
	 * @component NotificationsPopover
	 * @description A popover component that displays user notifications with auto-close functionality,
	 * infinite scrolling, and date-based grouping with timezone awareness.
	 */

	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Popover, { type TriggerSnippetProps } from '@pindoba/svelte-popover';
	import { intlFormatDistance } from 'date-fns';
	import { formatInTimeZone } from 'date-fns-tz';
	import { untrack, onMount, onDestroy } from 'svelte';
	import Notification from '$lib/components/notification.svelte';
	import {
		notifications,
		type Notification as NotificationType
	} from '$lib/stores/notifications.svelte';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';

	/**
	 * Represents a group of notifications for a specific date
	 */
	interface NotificationGroup {
		date: Date;
		notifications: NotificationType[];
	}

	// State management
	let open = $state(false);
	let timeoutID = $state<number | undefined>(undefined);
	let showMore = $state(false);
	let observer: IntersectionObserver | null = $state(null);
	let sentinel: HTMLElement | null = $state(null);
	let page = $state(1);
	let isLoading = $state(false);
	let hasError = $state(false);
	let errorMessage = $state('');

	// Configuration constants
	const AUTO_CLOSE_DELAY = 2000; // ms
	const PAGE_SIZE = 10;

	// Get user's timezone for consistent date handling
	const userTimeZone = $state(Intl.DateTimeFormat().resolvedOptions().timeZone);

	/**
	 * Formats a date in the user's timezone
	 * @param date - The date to format
	 * @param format - The format string to use
	 * @returns A formatted date string in the user's timezone
	 */
	function formatToUserTimezone(date: Date, format = 'yyyy-MM-dd'): string {
		try {
			return formatInTimeZone(date, userTimeZone, format);
		} catch (error) {
			console.error('Error formatting date:', error);
			// Fallback to ISO string if formatting fails
			return date.toISOString().split('T')[0];
		}
	}

	/**
	 * Groups notifications by date in the user's timezone
	 * @returns An array of notification groups sorted by date (newest first)
	 */
	function getGroupedNotifications(): NotificationGroup[] {
		if (!showMore) return [];

		try {
			// Get paginated notifications in reverse order (newest first)
			const reversedNotifications = [...notifications.list].reverse().slice(0, page * PAGE_SIZE);

			// Group by date in user's timezone
			const groups: Record<string, NotificationType[]> = {};

			reversedNotifications.forEach((notification) => {
				if (!notification.date) return;

				const date = new Date(notification.date);
				// Use the user's timezone to create the date key
				const dateKey = formatToUserTimezone(date);

				if (!groups[dateKey]) {
					groups[dateKey] = [];
				}

				groups[dateKey].push(notification);
			});

			// Convert to array of objects with date and notifications
			return Object.entries(groups)
				.map(([dateKey, groupNotifications]) => ({
					date: new Date(dateKey),
					notifications: groupNotifications
				}))
				.sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date, newest first
		} catch (error) {
			console.error('Error grouping notifications:', error);
			hasError = true;
			errorMessage = 'Failed to load notifications';
			return [];
		}
	}

	// Derived state for grouped notifications
	let groupedNotifications = $derived(getGroupedNotifications());

	/**
	 * Opens the notification popover and starts the auto-close timer
	 */
	function handleOpen() {
		open = true;
		startAutoCloseTimer();
	}

	/**
	 * Handles opening and closing side effects
	 */
	$effect(() => {
		if (open) {
			untrack(startAutoCloseTimer);
			page = 1;
		}

		if (!open) {
			untrack(() => (showMore = false));
		}
	});

	/**
	 * Closes the notification popover and resets the state
	 */
	function handleClose() {
		open = false;
		showMore = false;
	}

	/**
	 * Starts the auto-close timer which closes the popover after a delay
	 */
	function startAutoCloseTimer() {
		if (open) {
			clearAutoCloseTimer();
			timeoutID = window.setTimeout(() => {
				handleClose();
			}, AUTO_CLOSE_DELAY);
		}
	}

	/**
	 * Clears the auto-close timer
	 */
	function clearAutoCloseTimer() {
		if (timeoutID !== undefined) {
			window.clearTimeout(timeoutID);
			timeoutID = undefined;
		}
	}

	/**
	 * Effect that opens the notification popover when new notifications arrive
	 */
	$effect(() => {
		if (notifications.list.length > 0) {
			untrack(handleOpen);
		}
	});

	/**
	 * Loads more notifications when the user scrolls to the bottom
	 */
	function loadMoreNotifications() {
		try {
			isLoading = true;
			// Avoid loading more if all items are loaded
			if (page * PAGE_SIZE < notifications.list.length) {
				page++;
			}
		} catch (error) {
			console.error('Error loading more notifications:', error);
			hasError = true;
			errorMessage = 'Failed to load more notifications';
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Sets up the Intersection Observer for infinite scrolling
	 */
	function setupObserver() {
		if (observer) return;

		try {
			observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting && !isLoading) {
							loadMoreNotifications();
						}
					});
				},
				{
					rootMargin: '100px',
					threshold: 0.1
				}
			);

			if (sentinel) {
				observer.observe(sentinel);
			}
		} catch (error) {
			console.error('Error setting up intersection observer:', error);
			// Fallback to manual loading if observer fails
			observer = null;
		}
	}

	// Lifecycle methods
	onMount(() => {
		handleClose();
		setupObserver();
	});

	onDestroy(() => {
		clearAutoCloseTimer();
		if (observer && sentinel) {
			observer.unobserve(sentinel);
			observer.disconnect();
		}
	});

	// Force reactivity for grouped notifications
	$effect(() => {
		getGroupedNotifications();
	});

	// Accessibility label for notification count
	const notificationCountLabel = $derived(
		notifications.list.length === 0
			? 'No new notifications'
			: `${notifications.list.length} ${notifications.list.length === 1 ? 'notification' : 'notifications'}`
	);
</script>

<Popover
	id="notifications"
	title="Notifications"
	placement="top"
	data-testid="notifications"
	data-open={open}
	data-show-more={showMore}
	bind:open
	onmouseenter={() => {
		clearAutoCloseTimer();
	}}
	onmouseleave={() => {
		startAutoCloseTimer();
	}}
	closeButtonProps={{
		autofocus: true,
		'aria-label': 'Close notifications'
	}}
	class={css({
		width: '400px',
		maxWidth: '95vw'
	})}
	passThrough={{
		header: css.raw({
			translucent: 'md',
			background: 'neutral.alpha.50',
			position: 'sticky',
			top: '0',
			zIndex: '1',
			px: 'md',
			py: 'xs',
			marginBottom: 'md',
			'[data-show-more="true"] &': {
				marginBottom: '0'
			},
			'[data-show-more="false"] &': {
				_dark: {
					borderBottom: '1px solid token(colors.neutral.200)'
				},
				_light: {
					borderBottom: '1px solid token(colors.neutral.400)'
				}
			}
		}),
		title: css.raw({
			p: 0
		}),
		closeButton: css.raw({
			translucent: 'md',
			background: 'neutral.alpha.50',
			top: 'xs',
			right: 'xs'
		}),
		content: css.raw({
			padding: '0',
			gap: '0',
			zIndex: '0'
		}),
		wrapper: css.raw({
			display: 'flex',
			flexDirection: 'column',
			gap: '0',
			maxHeight: '80vh',
			overflowY: 'auto',
			overflowX: 'hidden'
		})
	}}
>
	{#snippet trigger(props: TriggerSnippetProps)}
		<Button
			size="xs"
			shape="square"
			emphasis="ghost"
			{...props}
			aria-label={notificationCountLabel}
		>
			<Icon
				icon="mingcute:notification-fill"
				width="16px"
				height="16px"
				class={css({
					_dark: {
						color: 'primary.800'
					},
					_light: {
						color: 'primary.800.contrast'
					},
					_hover: {
						color: 'primary.950',
						_light: {
							color: 'primary.800'
						}
					}
				})}
				aria-hidden="true"
			/>
			<span class={visuallyHidden()}>{notificationCountLabel}</span>
		</Button>
	{/snippet}
	<div
		class={css({
			display: 'flex',
			padding: '0',
			pt: '0',
			flexDirection: 'column'
		})}
		role="log"
		aria-live="polite"
		aria-atomic="false"
	>
		{#if hasError}
			<div
				class={css({
					p: 'md',
					color: 'danger.500',
					textAlign: 'center'
				})}
				role="alert"
			>
				{errorMessage}
				<Button
					size="sm"
					emphasis="ghost"
					feedback="danger"
					onclick={() => {
						hasError = false;
						errorMessage = '';
						page = 1;
					}}
				>
					Retry
				</Button>
			</div>
		{:else if notifications.list.length === 0}
			<p
				class={css({
					p: 'md',
					textAlign: 'center',
					color: 'neutral.700'
				})}
			>
				You have no new notifications at the moment.
			</p>
		{:else if notifications.last && !showMore}
			<div
				class={css({
					px: 'md',
					pb: 'md'
				})}
			>
				<Notification {...notifications.last} />
			</div>
		{:else if showMore}
			<div
				class={css({
					position: 'sticky',
					top: '0'
				})}
			>
				{#each groupedNotifications as group (group.date.toISOString())}
					<h4
						class={css({
							position: 'sticky',
							top: '46px',
							background: 'neutral.alpha.50',
							translucent: 'md',
							px: 'md',
							py: 'xs',
							margin: '0',
							zIndex: '1',
							_dark: {
								borderBottom: '1px solid token(colors.neutral.200)',
								borderTop: '1px solid token(colors.neutral.200)'
							},
							_light: {
								borderBottom: '1px solid token(colors.neutral.400)',
								borderTop: '1px solid token(colors.neutral.400)'
							},
							fontSize: 'sm',
							fontWeight: 'semibold',
							textTransform: 'capitalize',
							marginBottom: 'md'
						})}
					>
						{intlFormatDistance(
							group.date,
							new Date(formatToUserTimezone(new Date(), 'yyyy-MM-dd')),
							{
								unit: 'day'
							}
						)}
						<span
							class={css({
								fontWeight: 'normal',
								fontSize: 'xs',
								color: 'neutral.900',
								textTransform: 'capitalize'
							})}
						>
							({intlFormatDistance(
								group.date,
								new Date(formatToUserTimezone(new Date(), 'yyyy-MM-dd')),
								{
									unit: 'month'
								}
							)})
						</span>
					</h4>

					<div
						class={css({
							px: 'md',
							pb: 'md',
							display: 'flex',
							flexDirection: 'column',
							gap: 'md'
						})}
					>
						{#each group.notifications as notification (notification.id)}
							<div
								class={css({
									zIndex: '0'
								})}
							>
								<Notification {...notification} />
							</div>
						{/each}
					</div>
				{/each}
			</div>

			{#if isLoading}
				<div
					class={css({
						p: 'md',
						textAlign: 'center',
						color: 'neutral.700'
					})}
					aria-live="polite"
				>
					Loading more notifications...
				</div>
			{/if}
		{/if}
	</div>

	<!-- Sentinel element for infinite scrolling -->
	<div
		bind:this={sentinel}
		class={css({
			width: '100%'
		})}
		aria-hidden="true"
	></div>

	{#if notifications.list.length > 0}
		<Button
			onclick={() => (showMore = !showMore)}
			size="sm"
			feedback="neutral"
			emphasis="secondary"
			aria-expanded={showMore}
			aria-controls="notifications-list"
			passThrough={{
				root: css.raw({
					translucent: 'md',
					borderRadius: '0',
					bottom: '0',
					width: '100%',
					boxShadow: '0 0 0 1px token(colors.neutral.alpha.300)',
					position: 'sticky'
				})
			}}
		>
			Show {showMore ? 'Less' : 'More'}
		</Button>
	{/if}
</Popover>
