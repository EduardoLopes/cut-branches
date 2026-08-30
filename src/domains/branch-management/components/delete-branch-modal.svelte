<script lang="ts">
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import Modal from '@pindoba/svelte-dialog';
	import Loading from '@pindoba/svelte-loading';
	import Panel from '@pindoba/svelte-panel';
	import Stamp from '@pindoba/svelte-stamp';
	import { createVirtualizer } from '@tanstack/svelte-virtual';
	import { get } from 'svelte/store';
	import { type Branch } from '../core/models/branch';
	import BranchAlerts from '$domains/branch-management/components/branch-alerts.svelte';
	import { getDeletedBranchesStore } from '$domains/branch-management/core/composables/deleted-branches.svelte';
	import { useBranchMetrics } from '$domains/branch-management/core/composables/use-branch-metrics.svelte';
	import { createDeleteBranchesMutation } from '$domains/branch-management/infrastructure/mutations/create-delete-branches-mutation';
	import { createGetBranchesQuery } from '$domains/branch-management/infrastructure/queries/create-get-branches-query';
	import {
		getBranchAlerts,
		shouldShowBranchAlerts
	} from '$domains/branch-management/utils/branch-utils';
	import { createGetRepositoryListQuery } from '$infrastructure/queries/create-get-repository-list-query';
	import { isFeatureEnabled } from '$lib/feature-flags.svelte';
	import { resolveRepositorySubPath } from '$lib/repository-route';
	import { notifications } from '$services/notifications/notifications.svelte';
	import BranchCard from '$ui/core/branch-card.svelte';
	import ValidationHint from '$ui/patterns/validation-hint.svelte';
	import { ensureString, formatString } from '$utils/string-utils';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		id?: string;
	}

	let open = $state(false);
	let hintOpen = $state(false);

	let { id }: Props = $props();

	const getRepositoryQuery = createGetRepositoryListQuery();

	const repository = $derived(getRepositoryQuery.data?.find((repo) => repo.id === id));
	const getBranchesQuery = createGetBranchesQuery(() => ({
		repoId: id ?? '',
		filters: { deletionStatus: 'active', selectionStatus: 'selected' }
	}));

	// `?? 0` is load-bearing: while the selection query is still loading the data
	// is `undefined`, and an unguarded `selectedCount === 0` check let a click
	// open an empty dialog. Treat "not loaded yet" as "nothing selected".
	const selectedCount = $derived(getBranchesQuery.data?.branches.length ?? 0);

	// Clear the validation hint as soon as the user selects something.
	$effect(() => {
		if (hintOpen && selectedCount !== 0) {
			hintOpen = false;
		}
	});

	const deleteMutation = createDeleteBranchesMutation({
		onSuccess(data) {
			const m = data.deletedBranches
				.map((item) => {
					return formatString('- **{name}** (was {sha})', {
						name: ensureString(item.branch.name).trim(),
						sha: ensureString(item.branch.lastCommit.shortSha).trim()
					});
				})
				.join('\n\n');

			notifications.push({
				feedback: 'success',
				title: formatString('{type} deleted from {repo} repository', {
					type: data.deletedBranches.length > 1 ? 'Branches' : 'Branch',
					repo: ensureString(repository?.name)
				}),
				message: m
			});
		},
		meta: {
			showErrorNotification: true,
			// Await repository/branch query invalidation so the list is already
			// refreshed by the time the modal closes.
			awaitInvalidates: [['repository'], ['branch']]
		}
	});

	// current branch first
	function sort(a: Branch, b: Branch) {
		if (a.isCurrent()) {
			return -1;
		}
		if (b.isCurrent()) {
			return 1;
		}
		// a must be equal to b
		return 0;
	}

	let branches = $derived([...(getBranchesQuery.data?.branches ?? [])].sort(sort));

	// ---------------------------------------------------------------------------
	// Virtualized confirmation list. Selecting all in a large repository can put
	// hundreds of branches here; rendering a card per branch froze the modal on
	// open. A plain sliding window is enough for a dialog (no retention games —
	// this list is read once, top to bottom).
	// ---------------------------------------------------------------------------
	/** Rough compact-card height; each mounted row reports its real height. */
	const ESTIMATED_ROW_H = 72;
	const ROW_GAP = 8;

	let scrollElement = $state<HTMLDivElement | null>(null);

	const virtualizerOptions = {
		get count() {
			// Zero while closed: the list is gated on `open` (the dialog element
			// exists in the DOM even when closed), so the virtualizer must not
			// hold on to rows nobody renders.
			return open ? branches.length : 0;
		},
		getScrollElement: () => scrollElement,
		estimateSize: () => ESTIMATED_ROW_H,
		overscan: 8,
		gap: ROW_GAP,
		// The scroll port only exists once the dialog opens; seed a plausible
		// height so the first open paints a full window instead of one row.
		initialRect: { width: 0, height: window.innerHeight / 2 },
		getItemKey: (index: number) => {
			const branch = branches[index];
			return branch ? `${branch.getName()}-${branch.getLastCommit().getSha()}` : index;
		}
	};

	const virtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>(virtualizerOptions);

	// Re-apply live options before render whenever the list or the open state
	// changes (same pattern as branch-list: the adapter re-imposes its seed
	// options when the store gains its first subscriber).
	$effect.pre(() => {
		const count = open ? branches.length : 0;
		const element = scrollElement;
		get(virtualizer).setOptions({
			...virtualizerOptions,
			count,
			getScrollElement: () => element
		});
	});

	const virtualItems = $derived($virtualizer.getVirtualItems());
	const totalSize = $derived($virtualizer.getTotalSize());

	function measureRow(node: HTMLDivElement) {
		get(virtualizer).measureElement(node);
	}

	// Merge status feeds the per-card alerts ("not fully merged" is the one
	// warning that matters right before deletion). Batched over the visible
	// window, same as the main list — no per-row commands.
	const visibleRange = $derived($virtualizer.range);
	const branchMetrics = useBranchMetrics({
		path: () => repository?.path,
		branchNames: () => branches.map((branch) => branch.getName()),
		visibleRange: () => visibleRange,
		enabled: () => open
	});

	function handleDelete() {
		if (repository?.path && id) {
			deleteMutation.mutate(
				{
					path: repository.path,
					repoId: id,
					branches: branches.map((item) => item.getName())
				},
				{
					onSuccess: (data) => {
						// Log deleted branches to the deleted branches store
						const deletedBranchesStore = getDeletedBranchesStore(repository.id);
						if (deletedBranchesStore && repository.path) {
							data.deletedBranches.forEach((deletedBranch) => {
								deletedBranchesStore.addDeletedBranch(deletedBranch.branch);
							});
						}

						open = false;
					}
				}
			);
		}
	}

	function handleCancel() {
		open = false;
	}
</script>

<Modal
	bind:open
	title="Delete branches"
	aria-label="Delete branches"
	aria-describedby="Delete branches"
	data-testid="delete-branch-dialog"
	showCloseButton={!deleteMutation.isPending}
	passThrough={{
		content: {
			style: css.raw({
				display: 'flex',
				flexDirection: 'column',
				gap: 'md'
			})
		}
	}}
>
	<p data-testid="delete-branch-dialog-question">
		Are you sure you want these branches from the repository <strong
			class={css({
				color: 'danger',
				fontSize: 'lg'
			})}>{repository?.name}</strong
		>?
	</p>

	<Panel
		title="Branches to delete"
		aria-label="Branches to delete"
		aria-describedby="Branches to delete"
		radius="md"
		padding="none"
		class={css({
			display: 'flex',
			flexDirection: 'column',
			minHeight: '0',
			py: '1px'
		})}
	>
		<!-- Gated on `open`: the dialog element (and its children) exist in the
		     DOM even while closed, so without this every selection change would
		     eagerly render a card per selected branch into a hidden dialog —
		     select-all on a large repository froze on exactly that. The list is
		     also virtualized: only the visible window of cards is mounted, so
		     opening the modal costs a screenful regardless of how many branches
		     are selected. The scroll port owns the overflow (the Panel root
		     doesn't scroll its slotted content reliably inside a <dialog>). -->
		{#if open}
			<div
				bind:this={scrollElement}
				data-testid="delete-branch-list"
				class={css({
					maxHeight: '50vh',
					overflowY: 'auto',
					overflowX: 'hidden'
				})}
			>
				<div class={css({ position: 'relative', width: 'full' })} style:height={`${totalSize}px`}>
					{#each virtualItems as virtualRow (virtualRow.key)}
						{@const branch = branches[virtualRow.index]}
						{#if branch}
							{@const metrics = branchMetrics.getMetrics(branch.getName())}
							{@const alerts = getBranchAlerts(branch, true, metrics?.isMerged)}
							<div
								data-index={virtualRow.index}
								use:measureRow
								class={css({
									position: 'absolute',
									top: '0',
									left: '0',
									width: 'full'
								})}
								style:transform={`translateY(${virtualRow.start}px)`}
							>
								<!-- Compact: the last-commit block is dropped — right before a
								     deletion the alerts (unmerged work, protected names) matter
								     more than the commit subject, and the card stays short. The
								     diff link remains for reviewing what the branch adds. -->
								<BranchCard
									{branch}
									compact
									radius="inner"
									selected={true}
									diffHref={isFeatureEnabled('branch-diff') && id && !branch.isCurrent()
										? `${resolveRepositorySubPath(id, 'diff')}?branch=${encodeURIComponent(branch.getName())}`
										: undefined}
									children={shouldShowBranchAlerts(alerts, branch)
										? branchAlertsContent
										: undefined}
								/>
								{#snippet branchAlertsContent()}
									<BranchAlerts {alerts} {branch} />
								{/snippet}
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	</Panel>

	<div
		class={css({
			display: 'flex',
			justifyContent: 'flex-end',
			gap: 'md'
		})}
	>
		<Button
			emphasis="secondary"
			onclick={handleCancel}
			data-testid="cancel-button"
			disabled={deleteMutation.isPending}>Cancel</Button
		>
		<Loading loading={deleteMutation.isPending} variant="busy" indicator
			><Button feedback="danger" autofocus onclick={handleDelete} data-testid="delete-button"
				>Delete</Button
			></Loading
		>
	</div>
</Modal>

<ValidationHint
	bind:open={hintOpen}
	message="Select at least one branch to delete."
	data-testid="open-dialog-validation"
>
	{#snippet trigger(triggerProps)}
		<Button
			{...triggerProps}
			feedback="danger"
			size="sm"
			class={css({
				whiteSpace: 'nowrap'
			})}
			onclick={() => {
				if (selectedCount === 0) {
					hintOpen = true;
					return;
				}
				open = true;
			}}
			data-testid="open-dialog-button"
		>
			Delete
			{#snippet leading()}
				<Stamp emphasis="ghost" border="none" background="transparent">
					<Icon icon="ion:trash-outline" width="16px" height="16px" />
				</Stamp>
			{/snippet}
			{#snippet trailing()}
				<Badge size="sm" emphasis="adaptive">{selectedCount}</Badge>
			{/snippet}
		</Button>
	{/snippet}
</ValidationHint>
