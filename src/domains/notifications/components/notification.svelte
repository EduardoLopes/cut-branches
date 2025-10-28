<script lang="ts">
	import Icon from '@iconify/svelte';
	import { css } from '@pindoba/styled-system/css';
	import Alert, { type AlertProps } from '@pindoba/svelte-alert';
	import Button from '@pindoba/svelte-button';
	import Markdown from 'svelte-exmarkdown';
	import { notifications, type Notification } from '$services/notifications/notifications.svelte';
	import { safeFormatRelativeDate, safeFormatDateDetailed, isToday } from '$utils/date-utils';
	import { debounce } from '$utils/svelte-runes-utils';
	import { isValidDate } from '$utils/validation-utils';

	type Props = {
		notification: Notification;
		emphasis?: AlertProps['emphasis'];
	};

	const { notification, emphasis }: Props = $props();
	const { feedback, id, title, message, date } = notification;
</script>

<Alert
	{feedback}
	{emphasis}
	class={css({
		position: 'relative'
	})}
>
	{#if id}
		<Button
			shape="circle"
			size="xs"
			feedback="danger"
			emphasis="ghost"
			onclick={debounce(() => {
				if (id) {
					notifications.delete([id]);
				}
			}, 200)}
			passThrough={{
				root: {
					style: css.raw({
						color: 'neutral.800',
						p: '0'
					})
				}
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
			gap: 'sm',
			width: 'full'
		})}
	>
		{#if title}
			<h3><Markdown md={title} /></h3>
		{/if}
		{#if message}
			<p
				class={css({
					'& ul': {
						listStyle: 'inside',
						lineHeight: '1.5'
					}
				})}
			>
				<Markdown md={message} />
			</p>
		{/if}

		{#if date && isValidDate(date)}
			{@const dateObj = new Date(date)}
			<time datetime={dateObj.toISOString()} title={safeFormatDateDetailed(dateObj)}>
				<div
					class={css({
						fontSize: 'sm',
						width: 'full',
						textAlign: 'right',
						opacity: '0.5'
					})}
				>
					{isToday(dateObj) ? 'Today' : safeFormatRelativeDate(dateObj)}
				</div>
			</time>
		{/if}
	</div>
</Alert>
