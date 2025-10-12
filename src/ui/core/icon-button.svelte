<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button, { type ButtonProps } from '@pindoba/svelte-button';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';

	interface Props extends ButtonProps {
		icon: string;
		label: string;
		visuallyHiddenLabel?: boolean;
	}

	const {
		icon,
		label,
		visuallyHiddenLabel = false,
		size = 'lg',
		emphasis = 'primary',
		...props
	}: Props = $props();
</script>

<Button {size} {emphasis} {...props}>
	<div
		class={css({
			display: 'flex',
			alignItems: 'center',
			gap: 'sm'
		})}
	>
		{#if visuallyHiddenLabel}
			<span class={visuallyHidden()}>{label}</span>
		{:else}
			<span>{label}</span>
		{/if}

		<Icon {icon} width="20px" height="20px" data-testid="icon-button-icon" />
	</div>
</Button>
