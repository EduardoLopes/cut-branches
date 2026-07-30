<script lang="ts">
	// Commit history + branch graph view. Design intent: understand-before-
	// delete — the left gutter (branch rows with cleanup signals + selection)
	// is the decision surface; the graph rail is context. The header hosts the
	// SAME DeleteBranchModal the branches screen uses, fed by the shared
	// cache-backed selection the gutter checkboxes write into.
	import Icon from '@iconify/svelte';
	import Alert from '@pindoba/svelte-alert';
	import Button from '@pindoba/svelte-button';
	import Stamp from '@pindoba/svelte-stamp';
	import { useCommitHistoryView } from '../application/use-commit-history-view.svelte';
	import CommitHistoryList from '../components/commit-history-list.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import DeleteBranchModal from '$domains/branch-management/components/delete-branch-modal.svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		id: string;
		/** `?commit=<sha>` deep-link target; null when absent. */
		targetCommit?: string | null;
	}

	let { id, targetCommit = null }: Props = $props();

	const view = useCommitHistoryView({
		getId: () => id,
		getTargetCommit: () => targetCommit
	});

	const host = css({
		display: 'flex',
		flexDirection: 'column',
		height: '100%',
		background: 'neutral.surface.step.1',
		color: 'neutral.text'
	});
	const header = css({
		display: 'flex',
		alignItems: 'center',
		gap: 'sm',
		px: 'md',
		py: 'sm',
		borderBottom: '1px solid',
		borderColor: 'neutral.border.muted',
		background: 'neutral.surface.step.1'
	});
	const title = css({ fontSize: 'md', fontWeight: 'bold' });
	const headerMeta = css({ fontSize: 'xs', color: 'neutral.text.muted' });
	const headerCount = css({ fontSize: 'xs', color: 'neutral.text.muted', ml: 'auto' });
	const bannerHost = css({
		px: 'md',
		py: 'xs',
		borderBottom: '1px solid',
		borderColor: 'neutral.border.muted'
	});
</script>

<div class={host}>
	<header class={header}>
		<Button
			emphasis="ghost"
			size="sm"
			onclick={() => goto(resolve(`/repos/${id}`))}
			data-testid="history-back-button"
		>
			{#snippet leading()}
				<Stamp emphasis="ghost" border="muted" background="transparent">
					<Icon icon="lucide:arrow-left" width="16px" height="16px" />
				</Stamp>
			{/snippet}
			Branches
		</Button>
		<h1 class={title}>Commit history</h1>
		{#if view.comparisons.baseName}
			<span class={headerMeta}>vs {view.comparisons.baseName}</span>
		{/if}
		<span class={headerCount}>
			{view.loadedCommitCount} of {view.totalCount} commits
		</span>
		<DeleteBranchModal {id} />
	</header>

	{#if view.isStale}
		<div class={bannerHost}>
			<Alert feedback="warning" emphasis="secondary" data-testid="history-stale-banner">
				<div class={css({ display: 'flex', alignItems: 'center', gap: 'sm' })}>
					<span>The repository changed while browsing — this history is out of date.</span>
					<Button size="xs" onclick={() => view.reload()}>Reload</Button>
				</div>
			</Alert>
		</div>
	{/if}

	{#if view.deepLinkError}
		<div class={bannerHost}>
			<Alert feedback="danger" emphasis="secondary" data-testid="history-deep-link-error">
				<div class={css({ display: 'flex', alignItems: 'center', gap: 'sm' })}>
					<span>{view.deepLinkError.description ?? view.deepLinkError.message}</span>
					<Button size="xs" emphasis="ghost" onclick={() => view.dismissDeepLinkError()}>
						Dismiss
					</Button>
				</div>
			</Alert>
		</div>
	{/if}

	{#if view.isError && view.error}
		<div class={css({ p: 'md' })}>
			<Alert feedback="danger" data-testid="history-error">
				{view.error.message}
			</Alert>
		</div>
	{:else}
		<CommitHistoryList {view} />
	{/if}
</div>
