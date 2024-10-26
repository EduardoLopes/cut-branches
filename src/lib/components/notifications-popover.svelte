<script lang="ts">
	import Popover, { type TriggerSnippetProps } from '@pindoba/svelte-popover';
	import Button from '@pindoba/svelte-button';
	import { css } from '@pindoba/panda/css';
	import Icon from '@iconify/svelte';
	import { visuallyHidden } from '@pindoba/panda/patterns';
	import { notifications } from '$lib/stores/notifications';
	import Alert from '@pindoba/svelte-alert';
	import { createNotifications } from '$lib/stores/notifications';
	import { intlFormat, intlFormatDistance } from 'date-fns';
	import { slide } from 'svelte/transition';
	import { onDestroy, onMount } from 'svelte';
	import Notification from './notification.svelte';
	import { isSameDay } from 'date-fns/isSameDay';
	import { he, pt } from 'date-fns/locale';

	const { remove } = createNotifications();

	let open = $state(false);
	let timeoutID = $state(0);
	let firstUpdate = $state(false);
	let showMore = $state(false);

	$effect(() => {
		if (open === false) {
			showMore = false;
		}
	});

	function autoClose() {
		if (open) {
			window.clearTimeout(timeoutID);
			timeoutID = window.setTimeout(() => {
				open = false;
			}, 2000);
		}
	}

	const notificationsStoreunsubscribe = notifications.subscribe(() => {
		if (firstUpdate) {
			open = true;

			autoClose();
		}
	});

	onMount(() => {
		firstUpdate = true;
	});

	onDestroy(() => {
		notificationsStoreunsubscribe();
	});

	const lastNotification = $derived($notifications[0]);
	const n = $derived($notifications.filter((item, index) => index !== 0));
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
			pb: 'md'
		}),
		closeButton: css.raw({
			translucent: 'md',
			background: 'neutral.alpha.50'
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
		{#if $notifications.length === 0}
			<p>You have no new notifications at the moment.</p>
		{/if}

		{#if lastNotification}
			<Notification {...lastNotification} />
		{/if}

		{#if showMore}
			{#each n as notification, index (notification.id)}
				{@const currentDate = notification?.date}
				{@const previousDate = n[Math.max(0, index - 1)].date}

				{#if currentDate && previousDate && !isSameDay(new Date(currentDate), new Date(previousDate))}
					<h4>{intlFormatDistance(new Date(currentDate), Date.now())}</h4>
				{/if}
				<div transition:slide|local={{ duration: 200 }}>
					<Notification {...notification} />
				</div>
			{/each}
		{/if}
	</div>
	{#if $notifications.length > 0}
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
