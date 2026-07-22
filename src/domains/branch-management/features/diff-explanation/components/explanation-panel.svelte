<script lang="ts">
	// Presentational control/status surface for one file's AI explanation. The
	// parent owns the composable (single-file or batch) and maps its state onto
	// `status` + `text`; the panel only renders the Explain / Cancel affordances
	// and the result. The granularity is chosen up front in the header, so this
	// panel just reflects it: whole-file text renders here as pre-wrapped plain
	// text (no HTML — safe by construction); per-change explanations render
	// inline in the diff instead, so this panel only points there. A note makes
	// the cost transparent: this uses the agent's own quota, it is not free.
	import Icon from '@iconify/svelte';
	import Alert from '@pindoba/svelte-alert';
	import Button from '@pindoba/svelte-button';
	import Loading from '@pindoba/svelte-loading';
	import Stamp from '@pindoba/svelte-stamp';
	import { css } from '@pindoba/styled-system/css';

	type ExplanationStatus = 'idle' | 'streaming' | 'done' | 'error' | 'cancelled';
	type ExplanationGranularity = 'file' | 'hunks';

	interface Props {
		/** Where the explanation stands. */
		status: ExplanationStatus;
		/** Accumulated whole-file text (may be partial while streaming). */
		text?: string;
		/** Failure message, shown when `status === 'error'`. */
		error?: string | null;
		/** Whole-file vs per-change; per-change output lives inline in the diff. */
		granularity?: ExplanationGranularity;
		/** Start (or restart) the explanation. */
		onExplain: () => void;
		/** Cancel an in-flight explanation. */
		onCancel?: () => void;
	}

	let {
		status,
		text = '',
		error = null,
		granularity = 'file',
		onExplain,
		onCancel = undefined
	}: Props = $props();

	const panel = css({
		display: 'flex',
		flexDirection: 'column',
		gap: 'xs',
		p: 'sm',
		borderTop: '1px solid token(colors.neutral.border.muted)',
		background: 'neutral.surface.step.1'
	});
	const toolbar = css({ display: 'flex', alignItems: 'center', gap: 'xs', flexWrap: 'wrap' });
	const costNote = css({ fontSize: 'xs', color: 'neutral.text.muted', ml: 'auto' });
	const mutedNote = css({ fontSize: 'xs', color: 'neutral.text.muted' });
	const prose = css({
		fontSize: 'sm',
		lineHeight: '1.5',
		color: 'neutral.text',
		whiteSpace: 'pre-wrap',
		wordBreak: 'break-word',
		fontFamily: 'body'
	});
</script>

<div class={panel} data-testid="explanation-panel" data-status={status}>
	<div class={toolbar}>
		{#if status === 'streaming'}
			<Loading loading data-testid="explanation-loading">
				<span class={css({ fontSize: 'xs', color: 'neutral.text.muted' })}>Explaining…</span>
			</Loading>
			{#if onCancel}
				<Button
					emphasis="ghost"
					size="xs"
					onclick={onCancel}
					data-testid="explanation-cancel"
					aria-label="Cancel explanation"
				>
					{#snippet leading()}
						<Stamp emphasis="ghost" border="none" background="transparent">
							<Icon icon="lucide:x" width="14px" height="14px" />
						</Stamp>
					{/snippet}
					Cancel
				</Button>
			{/if}
		{:else}
			<Button
				emphasis="secondary"
				size="xs"
				onclick={onExplain}
				data-testid="explanation-explain"
				aria-label={status === 'idle' ? 'Explain this change' : 'Regenerate explanation'}
			>
				{#snippet leading()}
					<Stamp emphasis="ghost" border="none" background="transparent">
						<Icon icon="lucide:sparkles" width="14px" height="14px" />
					</Stamp>
				{/snippet}
				{status === 'idle' ? 'Explain this change' : 'Regenerate'}
			</Button>
		{/if}
		<span class={costNote} title="Explanations run your configured local agent and use its quota.">
			Uses your agent's quota
		</span>
	</div>

	{#if status === 'error'}
		<Alert feedback="danger" data-testid="explanation-error">
			{error ?? 'Explanation failed'}
		</Alert>
	{:else if status === 'cancelled' && !text}
		<span class={mutedNote} data-testid="explanation-cancelled">Explanation cancelled.</span>
	{:else if granularity === 'hunks'}
		{#if status !== 'idle'}
			<span class={mutedNote} data-testid="explanation-inline-hint">
				Explanations appear inline beside each change below.
			</span>
		{/if}
	{:else if text}
		<p class={prose} data-testid="explanation-text">{text}</p>
	{/if}
</div>
