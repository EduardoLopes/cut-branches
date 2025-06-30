<script lang="ts">
	import Icon from '@iconify/svelte';
	import Alert, { type AlertProps } from '@pindoba/svelte-alert';
	import Button from '@pindoba/svelte-button';
	import Markdown from 'svelte-exmarkdown';
	import {
		notifications,
		type Notification
	} from '$domains/notifications/store/notifications.svelte';
	import { safeFormatRelativeDate, safeFormatDateDetailed, isToday } from '$utils/date-utils';
	import { debounce } from '$utils/svelte-runes-utils';
	import { isValidDate } from '$utils/validation-utils';
	import { css } from '@pindoba/panda/css';

	type Props = Notification & {
		emphasis?: AlertProps['emphasis'];
	};

	const { feedback, id, title, message, emphasis, date }: Props = $props();
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
