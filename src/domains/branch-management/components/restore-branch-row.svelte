<script lang="ts">
	import LucideCircle from '@lucide/svelte/icons/circle';
	import LucideCircleAlert from '@lucide/svelte/icons/circle-alert';
	import LucideCircleCheck from '@lucide/svelte/icons/circle-check';
	import LucideCircleMinus from '@lucide/svelte/icons/circle-minus';
	import LucideCircleX from '@lucide/svelte/icons/circle-x';
	import LucideGitBranch from '@lucide/svelte/icons/git-branch';
	import Alert from '@pindoba/svelte-alert';
	import Button from '@pindoba/svelte-button';
	import type { GridListRowContext } from '@pindoba/svelte-grid-list';
	import Loading from '@pindoba/svelte-loading';
	import Stamp from '@pindoba/svelte-stamp';
	import Markdown from 'svelte-exmarkdown';
	import type { Branch } from '$domains/branch-management/core/models/branch';
	import type { ConflictResolution, RestoreBranchResult } from '$infrastructure/bindings';
	import Icon from '$ui/core/icon.svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** The row's cell placer, from the GridList `row` snippet. */
		cell: GridListRowContext['cell'];
		branch: Branch;
		result: RestoreBranchResult | undefined;
		isPending: boolean;
		isCurrentConflict: boolean;
		isInFlight: boolean;
		existsAlready: boolean;
		preference: ConflictResolution | undefined;
		isProcessing: boolean;
		onSetPreference: (resolution: ConflictResolution) => void;
	}

	let {
		cell,
		branch,
		result,
		isPending,
		isCurrentConflict,
		isInFlight,
		existsAlready,
		preference,
		isProcessing,
		onSetPreference
	}: Props = $props();

	const status = $derived.by(() => {
		if (!result) return { icon: LucideCircle, tone: 'neutral' as const, label: '' };
		if (result.skipped)
			return { icon: LucideCircleMinus, tone: 'neutral' as const, label: 'Skipped' };
		if (result.success)
			return { icon: LucideCircleCheck, tone: 'success' as const, label: 'Restored' };
		if (result.requiresUserAction)
			return { icon: LucideCircleAlert, tone: 'warning' as const, label: 'Pending resolution' };
		return { icon: LucideCircleX, tone: 'danger' as const, label: 'Failed' };
	});

	// Show the spinner whenever this row's mutation is in flight, OR when the
	// flow is processing and we don't yet have a result and the row isn't
	// waiting for the user to act.
	const showLoading = $derived(
		!isCurrentConflict && (isInFlight || (isProcessing && !result && !isPending))
	);
	const showConflictChoice = $derived(!isProcessing && existsAlready);
	const showWaiting = $derived(isPending && !isCurrentConflict);

	const lineClass = css({ display: 'flex', alignItems: 'center', gap: 'xs', minWidth: '0' });
	const statusClass = css({
		justifyContent: 'flex-end',
		gap: 'xs',
		fontSize: 'xs',
		whiteSpace: 'nowrap'
	});
	const noteClass = css({
		display: 'flex',
		alignItems: 'center',
		gap: 'xs',
		fontSize: 'sm',
		color: 'warning.800'
	});
	// Static per tone: Panda only emits classes it can read at build time.
	const toneClass = {
		neutral: css({ color: 'neutral.text.muted' }),
		success: css({ color: 'success.800' }),
		warning: css({ color: 'warning.800' }),
		danger: css({ color: 'danger.800' })
	};
</script>

<!-- Line 1: which branch, and where its restore stands. Line 2 (spanning the
     row) only when there is something to decide or read. -->
<span {...cell('name', { class: lineClass })} data-testid="restore-branch-row">
	<Stamp size="sm" emphasis="ghost" border="none" background="transparent">
		<Icon icon={LucideGitBranch} width="14px" height="14px" />
	</Stamp>
	<span class={css({ fontWeight: 'semibold', truncate: true })} title={branch.getName()}>
		{branch.getName()}
	</span>
</span>

<span {...cell('status', { class: statusClass })} data-testid="restore-branch-status">
	{#if showLoading}
		<Loading loading variant="busy" indicator />
	{:else if result}
		<span class={toneClass[status.tone]}>{status.label}</span>
		<Stamp size="sm" emphasis="ghost" border="none" background="transparent" tone={status.tone}>
			<Icon icon={status.icon} width="16px" height="16px" />
		</Stamp>
	{/if}
</span>

{#if showConflictChoice}
	<span
		{...cell('name', { line: 2, span: 'status', class: noteClass })}
		data-testid="branch-conflict-warning"
	>
		<Icon icon={LucideCircleAlert} width="16px" height="16px" />
		Branch already exists
		<span class={css({ marginLeft: 'auto', display: 'flex', gap: 'xs' })}>
			<Button
				size="xs"
				emphasis={preference === 'Skip' ? 'primary' : 'secondary'}
				onclick={() => onSetPreference('Skip')}
				data-testid="pre-skip-button"
			>
				Skip
			</Button>
			<Button
				size="xs"
				tone="danger"
				emphasis={preference === 'Overwrite' ? 'primary' : 'secondary'}
				onclick={() => onSetPreference('Overwrite')}
				data-testid="pre-overwrite-button"
			>
				Overwrite
			</Button>
		</span>
	</span>
{:else if showWaiting}
	<span {...cell('name', { line: 2, span: 'status', class: noteClass })}>
		Waiting for user resolution...
	</span>
{:else if result?.message}
	<span {...cell('name', { line: 2, span: 'status' })}>
		<Alert tone="warning" emphasis="secondary" class={css({ width: 'full' })}>
			<Markdown md={result.message} />
		</Alert>
	</span>
{/if}
