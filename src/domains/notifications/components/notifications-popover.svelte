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
	import { untrack, onMount, onDestroy } from 'svelte';
	import Notification from '$domains/notifications/components/notification.svelte';
	import { useNotificationGrouping } from '$domains/notifications/core/composables/use-notification-grouping.svelte';
	import { useNotificationPagination } from '$domains/notifications/core/composables/use-notification-pagination.svelte';
	import { notifications } from '$domains/notifications/store/notifications.svelte';
	import { toUserTimezone } from '$utils/date-utils';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';

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
						color: 'neutral.900'
					},
					_light: {
						color: 'neutral.900'
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
					px: 'md',
					pb: 'md'
				})}
			>
				<Notification notification={notifications.last} />
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

					<div
						class={css({
							px: 'md',
							pb: 'md',
							display: 'flex',
							flexDirection: 'column',
							gap: 'md'
						})}
					>
						{#each group.notifications as notif (notif.id)}
							<div
								class={css({
									zIndex: '0'
								})}
							>
								<Notification notification={notif} />
							</div>
						{/each}
					</div>
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
