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
	class={css({
		width: '400px'
	})}
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
			flexDirection: 'column',
			maxHeight: '80vh',
			height: 'fit-content',
			gap: 'sm',
			mx: '-md',
			mb: '-md',
			borderRadius: 'md',
			overflowY: 'auto',
			px: 'md',
			pb: 'md',
			pt: 'xxs'
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
		{#if $notifications.length > 0}
			<Button
				onclick={() => (showMore = !showMore)}
				size="sm"
				emphasis="neutral"
				class={css({
					bottom: 0,
					position: 'sticky',
					width: '90%',
					margin: '0 auto'
				})}
			>
				Show {showMore ? 'Less' : 'More'}
			</Button>
		{/if}
	</div>
</Popover>
