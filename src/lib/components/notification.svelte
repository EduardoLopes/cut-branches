<script lang="ts">
	import Icon from '@iconify/svelte';
	import { css } from '@pindoba/panda/css';
	import Alert, { type AlertProps } from '@pindoba/svelte-alert';
	import Button from '@pindoba/svelte-button';
	import { intlFormat, intlFormatDistance } from 'date-fns';
	import { notifications, type Notification } from '../stores/notifications.svelte';
	import Markdown from 'svelte-exmarkdown';

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
			onclick={() => {
				if (id) {
					notifications.remove(id);
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
			gap: 'sm',
			width: 'full'
		})}
	>
		{#if title}
			<h3><Markdown md={title} /></h3>
		{/if}
		{#if message}
			<p>
				<Markdown md={message} />
			</p>
		{/if}

		{#if date}
			<time
				datetime={new Date(date)?.toISOString()}
				title={intlFormat(new Date(date), {
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
					{intlFormatDistance(new Date(date), Date.now())}
				</div>
			</time>
		{/if}
	</div>
</Alert>
