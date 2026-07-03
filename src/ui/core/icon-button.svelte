<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button, { type ButtonProps } from '@pindoba/svelte-button';
	import Stamp from '@pindoba/svelte-stamp';
	import { visuallyHidden } from '@pindoba/styled-system/patterns';

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

{#if visuallyHiddenLabel}
	<Button {size} {emphasis} {...props}>
		<Stamp emphasis="ghost" border="none" background="transparent">
			<Icon {icon} width="20px" height="20px" data-testid="icon-button-icon" />
		</Stamp>
		<span class={visuallyHidden()}>{label}</span>
	</Button>
{:else}
	<Button {size} {emphasis} {...props}>
		{label}
		{#snippet trailing()}
			<Stamp emphasis="ghost" border="none" background="transparent">
				<Icon {icon} width="20px" height="20px" data-testid="icon-button-icon" />
			</Stamp>
		{/snippet}
	</Button>
{/if}
