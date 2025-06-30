<script lang="ts">
	import Icon from '@iconify/svelte';
	import Markdown from 'svelte-exmarkdown';
	import { css } from '@pindoba/panda/css';
	import { token } from '@pindoba/panda/tokens';

	interface Props {
		message: string;
		description?: string;
		icon?: string;
		iconColor?: string;
	}

	const {
		message,
		description,
		icon = 'material-symbols:dangerous-rounded',
		iconColor = token('colors.danger.700')
	}: Props = $props();
</script>

<div
	class={css({
		display: 'grid',
		placeItems: 'center',
		height: '100%',
		fontSize: '2rem',
		flexDirection: 'column',
		gap: '1.6rem'
	})}
>
	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			gap: '1.6rem',
			maxWidth: '500px',
			textAlign: 'center'
		})}
	>
		<Icon {icon} width="64px" height="64px" color={iconColor} />
		<div class="message"><Markdown md={message} /></div>
		{#if description}
			<div
				class={css({
					fontSize: '1.8rem',
					textAlign: 'center',
					color: 'neutral.900'
				})}
			>
				<Markdown md={description} />
			</div>
		{/if}
	</div>
</div>
