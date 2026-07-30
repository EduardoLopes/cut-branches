<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { MenuNode } from '@pindoba/core-menu';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import Group from '@pindoba/svelte-group';
	import Loading from '@pindoba/svelte-loading';
	import Menu from '@pindoba/svelte-menu';
	import Radio from '@pindoba/svelte-radio';
	import Stamp from '@pindoba/svelte-stamp';
	import Tooltip from '@pindoba/svelte-tooltip';
	import type { Snippet } from 'svelte';
	import { useRepositoryActions } from '../core/composables/use-repository-actions.svelte';
	import { useRepositoryWatch } from '../core/composables/use-repository-watch.svelte';
	import { createGetBranchesQuery } from '../infrastructure/queries/create-get-branches-query';
	import RemoveRepositoryModal from './remove-repository-modal.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { createGetRepositoryQuery } from '$infrastructure/queries/create-get-repository-query';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		repositoryId: string;
		/**
		 * Extra options-menu actions injected by the composition root (the route),
		 * so features owned by other domains (e.g. repository cleanup) can appear
		 * here without this domain importing them — see §1.3.
		 */
		extraMenuItems?: MenuNode[];
		/**
		 * Primary context switch (e.g. Branches / Worktrees) rendered beside the
		 * repository name. Provided by the composition root so this domain stays
		 * unaware of the contexts it toggles between — see §1.3.
		 */
		contextSwitch?: Snippet;
	}

	const { repositoryId, extraMenuItems = [], contextSwitch }: Props = $props();

	// Safety net for the active repo: detects (and heals) drift the global
	// watcher may have missed. Exposes `outOfSync` so the manual Update action
	// only appears when the projection is actually behind git.
	const repositoryWatch = useRepositoryWatch(() => repositoryId);

	// Reveal + update actions backing the repository options menu. Update reuses
	// the watcher's refresh so it re-attaches the filesystem watch.
	const repositoryActions = useRepositoryActions(() => repositoryId, {
		onRefresh: () => repositoryWatch.refresh()
	});

	// The Remove action opens this confirmation dialog, which owns the deletion.
	let removeModalOpen = $state(false);

	const getRepositoryQuery = createGetRepositoryQuery(() => ({ id: repositoryId }));
	const getDeletedBranchesQuery = createGetBranchesQuery(() => ({
		repoId: repositoryId,
		filters: { deletionStatus: 'deleted' }
	}));
	const getActiveBranchesQuery = createGetBranchesQuery(() => ({
		repoId: repositoryId,
		filters: { deletionStatus: 'active' }
	}));

	const deletedBranchesCount = $derived(getDeletedBranchesQuery.data?.branches.length ?? 0);
	const activeBranchesCount = $derived(getActiveBranchesQuery.data?.branches.length ?? 0);
	// Whether this repository is a linked git worktree (not the main worktree).
	const isWorktree = $derived(getRepositoryQuery.data?.isWorktree ?? false);
	function goToBranches() {
		goto(resolve(`/repos/${repositoryId}`));
	}

	function goToDeletedBranches() {
		goto(resolve(`/repos/${repositoryId}/restore`));
	}

	// Derive the active tab from the route so it stays in sync when navigating
	// between the branches and restore views without remounting.
	const selectedTab = $derived(
		page.url.pathname.includes('restore') ? 'deleted-branches' : 'active-branches'
	);

	// The Active/Deleted tabs are branch sub-navigation; hide them in the
	// worktrees context (its own route).
	const showBranchTabs = $derived(!page.url.pathname.endsWith('/worktrees'));
</script>

{#snippet updateIcon()}
	<Stamp size="sm" emphasis="ghost" border="none" background="transparent">
		<Icon icon="lucide:refresh-cw" width="14px" height="14px" />
	</Stamp>
{/snippet}
{#snippet revealIcon()}
	<Stamp size="sm" emphasis="ghost" border="none" background="transparent">
		<Icon icon="lucide:folder-open" width="14px" height="14px" />
	</Stamp>
{/snippet}
{#snippet removeIcon()}
	<Stamp size="sm" emphasis="ghost" feedback="danger" border="none" background="transparent">
		<Icon icon="lucide:circle-x" width="14px" height="14px" />
	</Stamp>
{/snippet}

<div
	class={css({
		display: 'flex',
		flexDirection: 'column',
		gap: 'sm',
		top: '0',
		zIndex: '20',
		flexShrink: '0',
		px: 'sm',
		pt: 'sm',
		// No bottom padding when the branch tabs are shown — they sit flush on top of
		// the content panel below. Without tabs (worktrees), pad so the name row
		// isn't cramped against the content.
		pb: showBranchTabs ? '0' : 'sm'
	})}
>
	{#if getRepositoryQuery.isLoading}
		<Loading
			loading={getRepositoryQuery.isLoading}
			passThrough={{
				root: {
					style: css.raw({
						width: 'full',
						borderRadius: '0',
						height: 'full',
						position: 'absolute',
						top: '0',
						left: '0',
						right: '0',
						bottom: '0'
					})
				}
			}}
		/>
	{/if}

	<!-- Row 1: repository name with the options menu inline beside it (so it reads
	     clearly as "actions for this repository", §4), and the primary context
	     switch kept at the top-right. -->
	<div
		class={css({
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: 'md'
		})}
	>
		<div class={css({ display: 'flex', alignItems: 'center', gap: 'xs', minWidth: '0' })}>
			{#key getRepositoryQuery.data?.name}
				<h2
					class={css({
						textStyle: '2xl',
						margin: '0',
						minWidth: '0',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap'
					})}
					data-testid="repository-name"
				>
					<span
						class={css({
							textTransform: 'uppercase'
						})}
					>
						{getRepositoryQuery.data?.name}
					</span>
				</h2>
			{/key}
			{#if isWorktree}
				<Badge size="sm" feedback="warning" data-testid="repository-worktree-badge">
					{#snippet leading()}
						<Stamp emphasis="ghost"><Icon icon="lucide:trees" /></Stamp>
					{/snippet}
					worktree
				</Badge>
			{/if}

			<Menu
				placement="bottom-start"
				aria-label="Repository options"
				items={[
					...(repositoryWatch.outOfSync
						? [
								{
									type: 'action',
									id: 'update',
									label: 'Update',
									leading: updateIcon,
									disabled: repositoryActions.isRefreshing,
									onSelect: repositoryActions.update
								} satisfies MenuNode
							]
						: []),
					{
						type: 'action',
						id: 'reveal',
						label: 'Reveal in Finder',
						leading: revealIcon,
						disabled: !repositoryActions.repository,
						onSelect: repositoryActions.reveal
					},
					...extraMenuItems,
					{ type: 'separator', id: 'sep' },
					{
						type: 'action',
						id: 'remove',
						label: 'Remove',
						feedback: 'danger',
						leading: removeIcon,
						onSelect: () => (removeModalOpen = true)
					}
				] satisfies MenuNode[]}
			>
				{#snippet trigger(props)}
					<Tooltip content="Repository options" placement="bottom">
						{#snippet children(tipProps)}
							<Button
								size="sm"
								emphasis="secondary"
								shape="square"
								data-testid="repository-options-button"
								{...props}
								{...tipProps}
							>
								<Stamp emphasis="ghost" border="none" background="transparent">
									<Icon icon="lucide:ellipsis-vertical" width="16px" height="16px" />
								</Stamp>
							</Button>
						{/snippet}
					</Tooltip>
				{/snippet}
			</Menu>
		</div>

		{#if contextSwitch}
			<div class={css({ display: 'flex', alignItems: 'center', flexShrink: '0' })}>
				{@render contextSwitch()}
			</div>
		{/if}
	</div>

	<!-- Row 2 (navigation): branch sub-tabs, only in the branches context. Sized to
	     the tabs themselves (no reserved height) so they sit flush on top of the
	     content panel below, with nothing rendered in the worktrees context. -->
	{#if showBranchTabs}
		<div class={css({ display: 'flex' })}>
			<Group
				orientation="horizontal"
				passThrough={{
					root: {
						style: css.raw({ marginBottom: '-1px' })
					}
				}}
			>
				<Radio
					id="branches"
					name="repository-management"
					value="active-branches"
					background="surface.deep"
					appearance="tab"
					checked={selectedTab === 'active-branches'}
					role="tab"
					onchange={goToBranches}
				>
					Active
					{#snippet leading()}
						<Stamp emphasis="ghost" feedback="neutral" border="muted" background="transparent">
							<Icon icon="lucide:git-branch" width="14px" height="14px" />
						</Stamp>
					{/snippet}
					{#snippet trailing()}
						<Badge size="sm">{activeBranchesCount}</Badge>
					{/snippet}
				</Radio>
				<Radio
					id="deleted-branches"
					name="repository-management"
					value="restore"
					background="surface.deep"
					appearance="tab"
					feedback="danger"
					checked={selectedTab === 'deleted-branches'}
					role="tab"
					onchange={goToDeletedBranches}
				>
					Deleted
					{#snippet leading()}
						<Stamp emphasis="ghost" feedback="neutral" border="muted" background="transparent">
							<Icon icon="lucide:trash-2" width="14px" height="14px" />
						</Stamp>
					{/snippet}
					{#snippet trailing()}
						<Badge size="sm" feedback="danger">{deletedBranchesCount}</Badge>
					{/snippet}
				</Radio>
			</Group>
		</div>
	{/if}

	<RemoveRepositoryModal {repositoryId} bind:open={removeModalOpen} />
</div>
