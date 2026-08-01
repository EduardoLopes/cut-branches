<script lang="ts">
	import EmptyState from './empty-state.svelte';
	import { token } from '@pindoba/styled-system/tokens';

	interface Props {
		message: string;
		description?: string;
		icon?: string;
		iconColor?: string;
		testId?: string;
	}

	const {
		message,
		description,
		icon = 'material-symbols:dangerous-rounded',
		iconColor = token('colors.danger.text.accent'),
		testId
	}: Props = $props();
</script>

<!-- The error flavour of EmptyState: same block, danger icon. -->
<EmptyState {message} {description} {icon} {iconColor} {testId} />
