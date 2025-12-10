<script lang="ts">
	/**
	 * @component NotificationsPopover
	 * @description A popover component that displays user notifications with auto-close functionality,
	 * infinite scrolling, and date-based grouping with timezone awareness.
	 */

	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Panel from '@pindoba/svelte-panel';
	import Popover, { type TriggerSnippetProps } from '@pindoba/svelte-popover';
	import { intlFormatDistance } from 'date-fns';
	import { untrack, onMount, onDestroy } from 'svelte';
	import Notification from '$domains/notifications/components/notification.svelte';
	import { useNotificationGrouping } from '$domains/notifications/core/composables/use-notification-grouping.svelte';
	import { useNotificationPagination } from '$domains/notifications/core/composables/use-notification-pagination.svelte';
	import { notifications } from '$services/notifications/notifications.svelte';
	import { toUserTimezone } from '$utils/date-utils';
	import { css } from '@pindoba/styled-system/css';
	import { translucent, visuallyHidden } from '@pindoba/styled-system/patterns';

	// State management
	let open = $state(false);
	let timeoutID = $state<number | undefined>(undefined);
	let showMore = $state(false);

	// Configuration constants
	const AUTO_CLOSE_DELAY = 2000; // ms

	// Get user's timezone for consistent date handling
	const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	// Initialize pagination composable (reactive through getters)
	const pagination = useNotificationPagination({
		getNotifications: () => notifications.list,
		pageSize: 10
	});

	// Derived state for paginated notifications (only when showing more)
	const paginatedNotifications = $derived(showMore ? pagination.paginatedNotifications : []);

	// Derived state for grouped notifications
	const groupedNotifications = $derived(
		showMore
			? useNotificationGrouping({
					getNotifications: () => paginatedNotifications,
					userTimeZone,
					enabled: true
				}).grouped
			: []
	);

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
			pagination.reset();
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

	// Lifecycle methods
	onMount(() => {
		handleClose();
	});

	onDestroy(() => {
		clearAutoCloseTimer();
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
	class={css({
		width: '400px',
		maxWidth: '95vw'
	})}
	passThrough={{
		closeButton: {
			props: {
				autofocus: true,
				'aria-label': 'Close notifications'
			}
		},
		content: {
			style: css.raw({
				padding: 'none',
				gap: 'none'
			})
		}
	}}
>
	{#snippet trigger(props: TriggerSnippetProps)}
		<Button
			size="xs"
			shape="square"
			emphasis="ghost"
			{...props}
			aria-label={notificationCountLabel}
			data-testid="notifications-trigger"
		>
			<Icon icon="mingcute:notification-fill" width="14px" height="14px" aria-hidden="true" />
			<span class={visuallyHidden()}>{notificationCountLabel}</span>
		</Button>
	{/snippet}
	<div
		class={css({
			display: 'flex',
			padding: '0',
			flexDirection: 'column'
		})}
		role="log"
		aria-live="polite"
		aria-atomic="false"
	>
		{#if pagination.hasError}
			<div
				class={css({
					p: 'md',
					color: 'danger.500',
					textAlign: 'center'
				})}
				role="alert"
			>
				{pagination.errorMessage}
				<Button
					size="sm"
					emphasis="ghost"
					feedback="danger"
					onclick={() => {
						pagination.retry();
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
					p: 'md'
				})}
			>
				<Notification notification={notifications.last} />
			</div>
		{:else if showMore}
			<div
				class={css({
					position: 'sticky',
					top: '0',
					maxHeight: '60vh',
					overflowY: 'auto',
					pb: 'md'
				})}
			>
				{#each groupedNotifications as group (group.date.toISOString())}
					<h4
						class={css(
							translucent.raw({
								blur: 'md'
							}),
							css.raw({
								position: 'sticky',
								top: '0',
								background: 'neutral.alpha.50',
								px: 'md',
								py: 'xs',
								margin: '0',
								mt: 'md',
								zIndex: '1',
								fontSize: 'sm',
								fontWeight: 'semibold',
								textTransform: 'capitalize'
							})
						)}
					>
						{intlFormatDistance(group.date, toUserTimezone(new Date(), userTimeZone), {
							unit: 'day'
						})}
						<span
							class={css({
								fontWeight: 'normal',
								fontSize: 'xs',
								color: 'neutral.900',
								textTransform: 'capitalize'
							})}
						>
							({intlFormatDistance(group.date, toUserTimezone(new Date(), userTimeZone), {
								unit: 'month'
							})})
						</span>
					</h4>

					<Panel
						title={intlFormatDistance(group.date, toUserTimezone(new Date(), userTimeZone), {
							unit: 'month'
						})}
						passThrough={{
							root: {
								style: css.raw({
									p: 'md',
									display: 'flex',
									flexDirection: 'column',
									gap: 'sm',
									mx: 'sm',
									width: 'auto'
								})
							}
						}}
					>
						{#each group.notifications as notif (notif.id)}
							<Notification notification={notif} />
						{/each}
					</Panel>
				{/each}
			</div>

			{#if pagination.isLoading}
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
		use:pagination.bindSentinel
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
				root: {
					style: css.raw(
						css.raw({
							borderRadius: '0',
							boxShadow: 'none',
							bottom: '0',
							width: '100%',
							position: 'sticky',
							borderTopStyle: 'solid',
							borderTopWidth: '1px',
							borderTopColor: {
								_light: 'neutral.200',
								_dark: 'neutral.400'
							}
						})
					)
				}
			}}
		>
			Show {showMore ? 'Less' : 'More'}
		</Button>
	{/if}
</Popover>
