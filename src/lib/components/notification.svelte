<script lang="ts">
	import Icon from '@iconify/svelte';
	import { css } from '@pindoba/panda/css';
	import Alert from '@pindoba/svelte-alert';
	import Button from '@pindoba/svelte-button';
	import { intlFormat, intlFormatDistance } from 'date-fns';
	import { createNotifications, type Notification } from '../stores/notifications';

	type Props = Notification;

	const { feedback, id, title, message, date }: Props = $props();

	const { remove } = createNotifications();
</script>

<Alert
	{feedback}
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
					remove(id);
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
		<h3>{@html title}</h3>
		<p>
			{@html message}
		</p>

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
