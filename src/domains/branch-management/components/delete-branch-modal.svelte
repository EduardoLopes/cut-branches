<script lang="ts">
	import LucideFileDiff from '@lucide/svelte/icons/file-diff';
	import LucideGitBranch from '@lucide/svelte/icons/git-branch';
	import LucideTrash2 from '@lucide/svelte/icons/trash-2';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import Modal from '@pindoba/svelte-dialog';
	import GridList from '@pindoba/svelte-grid-list';
	import Loading from '@pindoba/svelte-loading';
	import Stamp from '@pindoba/svelte-stamp';
	import Tooltip from '@pindoba/svelte-tooltip';
	import { type Branch } from '../core/models/branch';
	import BranchAlerts from '$domains/branch-management/components/branch-alerts.svelte';
	import { getDeletedBranchesStore } from '$domains/branch-management/core/composables/deleted-branches.svelte';
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
	import Icon from '$ui/core/icon.svelte';
	import DialogFooter from '$ui/patterns/dialog-footer.svelte';
	import DialogHeader from '$ui/patterns/dialog-header.svelte';
	import ScrollWell from '$ui/patterns/scroll-well.svelte';
	import { ensureString, formatString } from '$utils/string-utils';
	import { css } from '@pindoba/styled-system/css';
	import { visuallyHidden } from '@pindoba/styled-system/patterns';

	interface Props {
		id?: string;
		/** Bindable visibility, opened by the branches' bulk bar. */
		open?: boolean;
	}

	let { id, open = $bindable(false) }: Props = $props();

	const getRepositoryQuery = createGetRepositoryListQuery();

	const repository = $derived(getRepositoryQuery.data?.find((repo) => repo.id === id));
	const getBranchesQuery = createGetBranchesQuery(() => ({
		repoId: id ?? '',
		filters: { deletionStatus: 'active', selectionStatus: 'selected' }
	}));

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

	const diffEnabled = $derived(isFeatureEnabled('branch-diff'));

	// Hoisted: `css()` is a runtime merge, not worth repeating per row.
	const nameCellClass = css({ display: 'grid', gap: '3xs', minWidth: '0' });
	const lineClass = css({ display: 'flex', alignItems: 'center', gap: 'xs', minWidth: '0' });
	const nameClass = css({ fontWeight: 'semibold', truncate: true });

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
		root: {
			style: css.raw({ width: '640px', maxWidth: 'calc(100vw - token(spacing.2xl))' })
		},
		content: {
			style: css.raw({
				display: 'flex',
				flexDirection: 'column',
				gap: 'md'
			})
		}
	}}
>
	{#snippet header()}
		<DialogHeader
			title="Delete branches"
			subtitle={`Are you sure you want these branches from the repository ${repository?.name ?? ''}?`}
			icon={LucideTrash2}
			subtitleTestId="delete-branch-dialog-question"
		/>
	{/snippet}

	<!-- Gated on `open`: the dialog element (and its children) exist in the
	     DOM even while closed, so without this every selection change would
	     render a row per selected branch into a hidden dialog. Rows are flat,
	     so even a select-all on a large repository renders them all at once.
	     The commit is left out: right before a deletion the alerts (unmerged
	     work, protected names) matter more, and the diff link stays for
	     reviewing what the branch adds. -->
	{#if open}
		<ScrollWell class={css({ maxHeight: '50vh' })} contained testId="delete-branch-list">
			<GridList
				scroll
				padding="xs"
				label="Branches to delete"
				items={branches}
				getId={(branch: Branch) => branch.getName()}
				look="cards"
				rowBackground="surface.peak"
				columns={[
					{ id: 'name', track: 'minmax(0, 1fr)' },
					{ id: 'actions', track: 'auto' }
				]}
			>
				{#snippet row(branch, { cell })}
					{@const alerts = getBranchAlerts(branch, true)}
					<div {...cell('name', { class: nameCellClass })} data-testid="delete-branch-row">
						<span class={lineClass}>
							<Stamp size="sm" emphasis="ghost" border="none" background="transparent">
								<Icon icon={LucideGitBranch} width="14px" height="14px" />
							</Stamp>
							<span class={nameClass} title={branch.getName()}>{branch.getName()}</span>
							{#if branch.isCurrent()}
								<Badge size="sm" tone="primary">current</Badge>
							{/if}
						</span>
						{#if shouldShowBranchAlerts(alerts, branch)}
							<span class={lineClass}>
								<BranchAlerts {alerts} {branch} />
							</span>
						{/if}
					</div>
					<span {...cell('actions')}>
						{#if diffEnabled && id && !branch.isCurrent()}
							<Tooltip content="View branch diff">
								{#snippet children(triggerProps)}
									<Button
										size="xs"
										shape="square"
										emphasis="ghost"
										href={`${resolveRepositorySubPath(id, 'diff')}?branch=${encodeURIComponent(branch.getName())}`}
										data-testid="branch-diff-link"
										{...triggerProps}
									>
										<Stamp emphasis="ghost" border="none" background="transparent">
											<Icon icon={LucideFileDiff} width="14px" height="14px" />
										</Stamp>
										<span class={visuallyHidden()}>View branch diff</span>
									</Button>
								{/snippet}
							</Tooltip>
						{/if}
					</span>
				{/snippet}
			</GridList>
		</ScrollWell>
	{/if}

	<DialogFooter>
		<Button
			emphasis="ghost"
			onclick={handleCancel}
			data-testid="cancel-button"
			disabled={deleteMutation.isPending}>Cancel</Button
		>
		<Loading loading={deleteMutation.isPending} variant="busy" indicator>
			<Button
				tone="danger"
				autofocus
				onclick={handleDelete}
				disabled={deleteMutation.isPending}
				data-testid="delete-button">Delete</Button
			>
		</Loading>
	</DialogFooter>
</Modal>
