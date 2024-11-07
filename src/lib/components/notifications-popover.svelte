<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Popover, { type TriggerSnippetProps } from '@pindoba/svelte-popover';
	import { intlFormatDistance } from 'date-fns';
	import { isSameDay } from 'date-fns/isSameDay';
	import { untrack, onMount , slide } from 'svelte';
	import Notification from './notification.svelte';
	import { notifications } from '$lib/stores/notifications.svelte';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';
	
	let open = $state(false);
	let timeoutID = $state(0);
	let showMore = $state(false);
	let observer: IntersectionObserver;
	let sentinel: HTMLElement | null = $state(null);
	let page = $state(1);
	const pageSize = 10;

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
</script>

<Popover
	id={'notifications'}
	title={'Notifications'}
	placement="top"
	bind:open
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
			gap: '0'
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
			gap: 'md',
			padding: 'md',
			pt: '0',
			flexDirection: 'column'
		})}
	>
		{#if notifications.list.length === 0}
			<p>You have no new notifications at the moment.</p>
		{/if}

		{#if notifications.last && !showMore}
			<Notification {...notifications.last} />
		{/if}

		{#if showMore}
			{#each notifications.list.slice(0, page * pageSize) as notification, index (notification.id)}
				{@const currentDate = notification?.date}
				{@const previousDate = notifications.list[Math.max(0, index - 1)].date}

				{#if currentDate && previousDate && !isSameDay(new Date(currentDate), new Date(previousDate))}
					<h4>{intlFormatDistance(new Date(currentDate), Date.now())}</h4>
				{/if}
				<div transition:slide|local={{ duration: 200 }}>
					<Notification {...notification} />
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
