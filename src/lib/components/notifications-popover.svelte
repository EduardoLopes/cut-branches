<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Popover, { type TriggerSnippetProps } from '@pindoba/svelte-popover';
	import { intlFormatDistance } from 'date-fns';
	import { formatInTimeZone } from 'date-fns-tz'; // Import timezone utility
	import { untrack, onMount } from 'svelte';
	import Notification from '$lib/components/notification.svelte';
	import {
		notifications,
		type Notification as NotificationType
	} from '$lib/stores/notifications.svelte';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';

	// Define a type for notification group
	interface NotificationGroup {
		date: Date;
		notifications: NotificationType[];
	}

	let open = $state(false);
	let timeoutID = $state(0);
	let showMore = $state(false);
	let observer: IntersectionObserver;
	let sentinel: HTMLElement | null = $state(null);
	let page = $state(1);
	const pageSize = 10;

	// Get user's timezone - we'll use this for consistent timezone handling
	const userTimeZone = $state(Intl.DateTimeFormat().resolvedOptions().timeZone);

	// Function to format a date in the user's timezone
	function formatToUserTimezone(date: Date, format: string = 'yyyy-MM-dd'): string {
		return formatInTimeZone(date, userTimeZone, format);
	}

	// Function to group notifications by date in user's timezone
	function getGroupedNotifications(): NotificationGroup[] {
		if (!showMore) return [];

		// Get paginated notifications in reverse order (newest first)
		const reversedNotifications = [...notifications.list].reverse().slice(0, page * pageSize);

		// Group by date in user's timezone
		const groups: Record<string, NotificationType[]> = {};

		reversedNotifications.forEach((notification) => {
			if (!notification.date) return;

			const date = new Date(notification.date);
			// Use the user's timezone to create the date key
			const dateKey = formatToUserTimezone(date);

			console.log({ dateKey });

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
	}

	// Derived state for grouped notifications
	let groupedNotifications = $derived(getGroupedNotifications());

	function handleOpen() {
		open = true;
		autoClose();
	}

	$effect(() => {
		if (open) {
			untrack(autoClose);
			page = 1;
		}

		if (!open) {
			untrack(() => (showMore = false));
		}
	});

	function handleClose() {
		open = false;
		showMore = false;
	}

	function autoClose() {
		if (open) {
			window.clearTimeout(timeoutID);
			timeoutID = window.setTimeout(() => {
				handleClose();
			}, 2000);
		}
	}

	$effect(() => {
		if (notifications.list.length > 0) {
			untrack(handleOpen);
		}
	});

	// Function to load more notifications
	function loadMoreNotifications() {
		// Simulate loading more notifications (replace with actual logic)
		page++;
	}

	// Set up the Intersection Observer
	function setupObserver() {
		observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						loadMoreNotifications();
					}
				});
			},
			{
				rootMargin: '0px',
				threshold: 1.0
			}
		);

		if (sentinel) {
			observer.observe(sentinel);
		}
	}

	onMount(() => {
		handleClose();
		setupObserver();
	});

	// We'll use this in the template to avoid TypeScript errors
	$effect(() => {
		getGroupedNotifications();
	});
</script>

<Popover
	id={'notifications'}
	title={'Notifications'}
	placement="top"
	open={true}
	onmouseenter={() => {
		window.clearTimeout(timeoutID);
	}}
	onmouseleave={() => {
		autoClose();
	}}
	closeButtonProps={{
		autofocus: true
	}}
	class={css({
		width: '400px'
	})}
	passThrough={{
		header: css.raw({
			translucent: 'md',
			background: 'neutral.alpha.50',
			position: 'sticky',
			top: '0',
			zIndex: '1',
			px: 'md',
			py: 'xs'
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
		<Button size="xs" shape="square" emphasis="ghost" {...props}>
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
			/>
			<span class={visuallyHidden()}>Notifications</span></Button
		>
	{/snippet}
	<div
		class={css({
			display: 'flex',
			padding: '0',
			pt: '0',
			flexDirection: 'column'
		})}
	>
		{#if notifications.list.length === 0}
			<p>You have no new notifications at the moment.</p>
		{/if}

		{#if notifications.last && !showMore}
			<div
				class={css({
					px: 'md',
					pb: 'md'
				})}
			>
				<Notification {...notifications.last} />
			</div>
		{/if}

		{#if showMore}
			{#each groupedNotifications as group}
				<h4
					class={css({
						position: 'sticky',
						top: 16,
						background: 'neutral.alpha.50',
						translucent: 'md',
						px: 'md',
						py: 'xs',
						margin: '0',
						zIndex: '2',
						boxShadow: '0 1px 0 token(colors.neutral.alpha.100)',
						fontSize: 'sm',
						fontWeight: 'semibold'
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
							color: 'neutral.900'
						})}
					>
						{intlFormatDistance(
							group.date,
							new Date(formatToUserTimezone(new Date(), 'yyyy-MM-dd')),
							{
								unit: 'month'
							}
						)}
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
		{/if}
	</div>
	<div bind:this={sentinel}></div>
	{#if notifications.list.length > 0}
		<Button
			onclick={() => (showMore = !showMore)}
			size="sm"
			feedback="neutral"
			emphasis={'secondary'}
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
