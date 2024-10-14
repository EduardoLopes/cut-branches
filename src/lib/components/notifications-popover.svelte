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

	const { remove } = createNotifications();

	let open = $state(false);
	let timeoutID = $state(0);
	let firstUpdate = $state(false);

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
			maxHeight: '400px',
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
		{#each $notifications as notification (notification.id)}
			<div transition:slide|local={{ duration: 200 }}>
				<Alert
					feedback={notification.feedback}
					class={css({
						position: 'relative'
					})}
				>
					{#if notification?.id}
						<Button
							shape="circle"
							size="xs"
							feedback="danger"
							emphasis="ghost"
							onclick={() => {
								if (notification?.id) {
									remove(notification?.id);
								}
							}}
							passThrough={{
								root: css.raw({
									color: 'neutral.800',
									p: '0'
								})
							}}
							class={css({
								position: 'absolute',
								top: 'xxs',
								right: 'xxs'
							})}
						>
							<Icon icon="mi:close" width="12px" height="12px" />
						</Button>
					{/if}
					<div
						class={css({
							display: 'flex',
							flexDirection: 'column',
							gap: 'sm'
						})}
					>
						<h3>{@html notification.title}</h3>
						<p>
							{@html notification.message}
						</p>

						{#if notification?.date}
							<time
								datetime={new Date(notification.date)?.toISOString()}
								title={intlFormat(new Date(notification.date), {
									year: 'numeric',
									month: 'long',
									day: 'numeric',
									hour: 'numeric',
									minute: 'numeric',
									second: 'numeric'
								})}
							>
								<div
									class={css({
										fontSize: 'sm',
										width: 'full',
										textAlign: 'right',
										opacity: '0.5'
									})}
								>
									{intlFormatDistance(new Date(notification.date), Date.now())}
								</div>
							</time>
						{/if}
					</div>
				</Alert>
			</div>
		{/each}
	</div>
</Popover>
