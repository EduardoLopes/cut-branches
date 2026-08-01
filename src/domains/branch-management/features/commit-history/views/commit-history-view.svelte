<script lang="ts">
	// Commit history + branch graph view. Design intent: understand-before-
	// delete — the left gutter (branch rows with cleanup signals + selection)
	// is the decision surface; the graph rail is context. The header hosts the
	// SAME DeleteBranchModal the branches screen uses, fed by the shared
	// cache-backed selection the gutter checkboxes write into.
	import Alert from '@pindoba/svelte-alert';
	import Button from '@pindoba/svelte-button';
	import { useCommitHistoryView } from '../application/use-commit-history-view.svelte';
	import CommitHistoryList from '../components/commit-history-list.svelte';
	import DeleteBranchModal from '$domains/branch-management/components/delete-branch-modal.svelte';
	import EmptyState from '$ui/core/empty-state.svelte';
	import PageToolbar from '$ui/patterns/page-toolbar.svelte';
	import PageWell from '$ui/patterns/page-well.svelte';
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

	const meta = css({ fontSize: 'xs', color: 'neutral.text.muted' });
</script>

<!-- The page title, repository name and back-trail live in the shared
     PageHeader (composed by the `[id]` layout), so this view owns only the
     well: a toolbar of history-scoped meta and actions, then the graph. -->
<PageWell isLoading={view.isLoading} testId="commit-history-well">
	{#snippet toolbar()}
		<PageToolbar data-testid="history-toolbar">
			{#snippet left()}
				{#if view.comparisons.baseName}
					<span class={meta} data-testid="history-base">vs {view.comparisons.baseName}</span>
				{/if}
				<span class={meta} data-testid="history-count">
					{view.loadedCommitCount} of {view.totalCount} commits
				</span>
			{/snippet}
			{#snippet right()}
				<DeleteBranchModal {id} />
			{/snippet}
		</PageToolbar>
	{/snippet}

	{#if view.isStale}
		<div class={css({ pb: 'sm' })}>
			<Alert feedback="warning" emphasis="secondary" data-testid="history-stale-banner">
				<div class={css({ display: 'flex', alignItems: 'center', gap: 'sm' })}>
					<span>The repository changed while browsing — this history is out of date.</span>
					<Button size="xs" onclick={() => view.reload()}>Reload</Button>
				</div>
			</Alert>
		</div>
	{/if}

	{#if view.deepLinkError}
		<div class={css({ pb: 'sm' })}>
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
		<Alert feedback="danger" data-testid="history-error">
			{view.error.message}
		</Alert>
	{:else if !view.isLoading && view.totalCount === 0}
		<EmptyState
			icon="lucide:git-commit-horizontal"
			heading="No commits yet"
			message="This repository has no commit history to show."
			testId="history-empty"
		/>
	{:else}
		<CommitHistoryList {view} />
	{/if}
</PageWell>
