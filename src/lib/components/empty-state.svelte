<script lang="ts">
	import Icon from '@iconify/svelte';
	import Markdown from 'svelte-exmarkdown';
	import { css } from '@pindoba/panda/css';
	import { token } from '@pindoba/panda/tokens';

	interface Props {
		message: string;
		icon?: string;
		iconColor?: string;
		testId?: string;
	}

	const {
		message,
		icon = 'material-symbols:search-off',
		iconColor = token('colors.danger.700'),
		testId
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
		<div class="message" data-testid={testId}><Markdown md={message} /></div>
	</div>
</div>
