<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import LucideOctagonX from '@lucide/svelte/icons/octagon-x';
	import EmptyState from './empty-state.svelte';
	import { token } from '@pindoba/styled-system/tokens';

	interface Props {
		message: string;
		description?: string;
		icon?: LucideIcon;
		iconColor?: string;
		testId?: string;
	}

	const {
		message,
		description,
		icon = LucideOctagonX,
		iconColor = token('colors.danger.text.accent'),
		testId
	}: Props = $props();
</script>

<!-- The error flavour of EmptyState: same block, danger icon. -->
<EmptyState {message} {description} {icon} {iconColor} {testId} />
