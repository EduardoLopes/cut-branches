<script lang="ts">
	import Progress from '@pindoba/svelte-progress';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		processed: number;
		total: number;
		progress: number;
		estimatedTimeRemaining: string | null;
		pendingConflicts: number;
	}

	let { processed, total, progress, estimatedTimeRemaining, pendingConflicts }: Props = $props();
</script>

<div
	class={css({ display: 'flex', flexDirection: 'column', gap: 'xs' })}
	data-testid="progress-container"
>
	<div class={css({ display: 'flex', justifyContent: 'space-between', fontSize: 'sm' })}>
		<span data-testid="progress-text">{processed} of {total} branches restored</span>
		{#if estimatedTimeRemaining && pendingConflicts === 0}
			<span data-testid="time-remaining">Estimated time remaining: {estimatedTimeRemaining}</span>
		{/if}
	</div>
	<Progress value={progress} max={100} feedback="primary" data-testid="progress-bar" />
</div>
