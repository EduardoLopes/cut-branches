<script lang="ts">
	import Button from '@pindoba/svelte-button';
	import Dialog from '@pindoba/svelte-dialog';
	import GridList from '@pindoba/svelte-grid-list';
	import Loading from '@pindoba/svelte-loading';
	import { useRestoreFlow } from '../core/composables/use-restore-flow.svelte';
	import { type Branch } from '../core/models/branch';
	import RestoreBranchRow from './restore-branch-row.svelte';
	import RestoreConflictPrompt from './restore-conflict-prompt.svelte';
	import RestoreProgressBar from './restore-progress-bar.svelte';
	import { createGetBranchesQuery } from '$domains/branch-management/infrastructure/queries/create-get-branches-query';
	import { createGetRepositoryListQuery } from '$infrastructure/queries/create-get-repository-list-query';
	import DialogFooter from '$ui/patterns/dialog-footer.svelte';
	import DialogHeader from '$ui/patterns/dialog-header.svelte';
	import ScrollWell from '$ui/patterns/scroll-well.svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		repoId?: string;
		/** Bindable visibility, opened by the branches' bulk bar. */
		open?: boolean;
	}

	let { repoId, open = $bindable(false) }: Props = $props();

	const getRepositoryQuery = createGetRepositoryListQuery();
	const getBranchesQuery = createGetBranchesQuery(() => ({
		repoId: repoId ?? '',
		filters: { deletionStatus: 'active' }
	}));
	const selectedQuery = createGetBranchesQuery(() => ({
		repoId: repoId ?? '',
		filters: { selectionStatus: 'selected', deletionStatus: 'deleted' }
	}));

	const repository = $derived(getRepositoryQuery.data?.find((repo) => repo.id === repoId));

	let prefsInitialized = $state(false);

	const flow = useRestoreFlow({
		getRepository: () => {
			if (!repository) return undefined;
			return { id: repository.id, name: repository.name, path: repository.path };
		},
		getBranches: () => selectedQuery.data?.branches ?? [],
		onComplete: () => {
			open = false;
		}
	});

	const existingBranches = $derived.by(() => {
		if (!open) return [];
		const response = getBranchesQuery.data?.branches;
		return Array.isArray(response) ? response.map((branch) => branch.getName()) : [];
	});

	// Reset flow + prefs-init flag whenever the modal closes.
	$effect(() => {
		if (!open) {
			flow.reset();
			prefsInitialized = false;
		}
	});

	// Seed default Skip preferences ONCE per modal-open, after data is available.
	// Re-running on later query refetches would clobber the user's choices.
	$effect(() => {
		if (!open || prefsInitialized) return;
		if (existingBranches.length === 0 && !getBranchesQuery.data) return;
		selectedQuery.data?.branches?.forEach((branch) => {
			const name = branch.getName();
			if (existingBranches.includes(name)) {
				flow.setPreference(name, 'Skip');
			}
		});
		prefsInitialized = true;
	});

	function handleCancel() {
		if (flow.isProcessing) return;
		open = false;
	}

	const sortedBranches = $derived.by(() => {
		const branches = [...(selectedQuery.data?.branches ?? [])];
		return branches.sort((a, b) => {
			const aIsPending = flow.pendingConflictBranches.includes(a.getName());
			const bIsPending = flow.pendingConflictBranches.includes(b.getName());
			if (aIsPending !== bIsPending) {
				return aIsPending ? -1 : 1;
			}
			const aSkipped = flow.restorationResults[a.getName()]?.skipped ?? false;
			const bSkipped = flow.restorationResults[b.getName()]?.skipped ?? false;
			return aSkipped === bSkipped ? 0 : aSkipped ? 1 : -1;
		});
	});
</script>

<Dialog
	bind:open
	title="Restore Deleted Branches"
	aria-label="Restore Deleted Branches"
	aria-describedby="Restore Deleted Branches"
	data-testid="restore-branch-dialog"
	showCloseButton={!flow.isProcessing || flow.isRestorationComplete}
	passThrough={{
		root: {
			style: css.raw({ width: '600px', maxWidth: 'calc(100vw - token(spacing.2xl))' })
		},
		content: {
			style: css.raw({ display: 'flex', flexDirection: 'column', gap: 'md' })
		}
	}}
>
	{#snippet header()}
		<DialogHeader title="Restore Deleted Branches" icon="lucide:rotate-ccw" />
	{/snippet}

	{#if flow.currentConflictBranch}
		<RestoreConflictPrompt
			branchName={flow.currentConflictBranch}
			onOverwrite={() => flow.resolveConflict('Overwrite')}
			onSkip={() => flow.resolveConflict('Skip')}
		/>
	{:else}
		<p data-testid="restore-branch-dialog-text">
			{#if flow.isProcessing && !flow.isRestorationComplete}
				Restoring selected branches...
				{#if flow.pendingConflictBranches.length > 0}
					<span class={css({ color: 'warning.600', fontWeight: 'medium' })}>
						({flow.pendingConflictBranches.length}
						{flow.pendingConflictBranches.length === 1 ? 'branch needs' : 'branches need'} resolution)
					</span>
				{/if}
			{:else if flow.isRestorationComplete}
				Restoration complete.
			{:else}
				Are you sure you want to restore
				<strong class={css({ color: 'primary.800' })}>
					{selectedQuery.data?.branches.length}
					{selectedQuery.data?.branches.length === 1 ? 'branch' : 'branches'}
				</strong>
				from repository
				<strong class={css({ color: 'primary.800' })}>{repository?.name}</strong>?
			{/if}
		</p>
	{/if}

	{#if flow.isProcessing && !flow.isRestorationComplete}
		<RestoreProgressBar
			processed={flow.processedCount}
			total={flow.initialSelectedCount}
			progress={flow.progress}
			estimatedTimeRemaining={flow.estimatedTimeRemaining}
			pendingConflicts={flow.pendingConflictBranches.length}
		/>
	{/if}

	<!-- Gated on `open`: the dialog's children render even while closed, so
	     without this every selection change would build a row per selected
	     branch into a hidden dialog. -->
	<ScrollWell class={css({ maxHeight: '50vh' })} testId="restore-branch-list">
		{#if open}
			<GridList
				label="Branches to restore"
				items={sortedBranches}
				getId={(branch: Branch) => branch.getName()}
				look="cards"
				rowBackground="surface.peak"
				columns={[
					{ id: 'name', track: 'minmax(0, 1fr)' },
					{ id: 'status', track: 'auto' }
				]}
			>
				{#snippet row(branch, { cell })}
					{@const branchName = branch.getName()}
					<RestoreBranchRow
						{cell}
						{branch}
						result={flow.restorationResults[branchName]}
						isPending={flow.pendingConflictBranches.includes(branchName)}
						isCurrentConflict={flow.currentConflictBranch === branchName}
						isInFlight={flow.inFlightBranches.includes(branchName)}
						existsAlready={existingBranches.includes(branchName)}
						preference={flow.branchPreferences[branchName]}
						isProcessing={flow.isProcessing}
						onSetPreference={(resolution) => flow.setPreference(branchName, resolution)}
					/>
				{/snippet}
			</GridList>
		{/if}
	</ScrollWell>

	<DialogFooter>
		{#if flow.isRestorationComplete}
			<Button emphasis="primary" onclick={() => (open = false)} data-testid="done-button">
				Done
			</Button>
		{:else}
			<Button
				emphasis="ghost"
				onclick={handleCancel}
				disabled={flow.isProcessing && !flow.isRestorationComplete}
				data-testid="cancel-button"
			>
				Cancel
			</Button>
			{#if !flow.currentConflictBranch}
				<Loading
					loading={flow.isProcessing && !flow.isRestorationComplete}
					variant="busy"
					indicator
				>
					<Button
						emphasis="primary"
						autofocus
						onclick={() => flow.start()}
						disabled={flow.isProcessing && !flow.isRestorationComplete}
						data-testid="restore-button"
					>
						Restore
					</Button>
				</Loading>
			{/if}
		{/if}
	</DialogFooter>
</Dialog>
