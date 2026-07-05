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
	}

	const { repositoryId }: Props = $props();

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
</script>

<div
	class={css({
		display: 'flex',
		justifyContent: 'space-between',
		top: '0',
		zIndex: '20',
		flexShrink: '0'
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

	<div
		class={css({
			display: 'flex',
			gap: 'sm',
			flexDirection: 'column'
		})}
	>
		{#key getRepositoryQuery.data?.name}
			<h2
				class={css({
					textStyle: '4xl',
					minHeight: '25px',
					px: 'sm',
					pt: 'sm'
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
			<div
				class={css({
					display: 'flex',
					alignItems: 'flex-end',
					marginLeft: 'sm'
				})}
			>
				<Group
					orientation="horizontal"
					passThrough={{
						root: {
							style: css.raw({
								outlineColor: 'neutral.border.muted'
							})
						}
					}}
				>
					<Radio
						id="branches"
						name="repository-management"
						value="active-branches"
						appearance="button"
						background="surface.deep"
						checked={selectedTab === 'active-branches'}
						role="tab"
						onchange={goToBranches}
						passThrough={{
							root: {
								style: css.raw({
									borderBottomRadius: '0',
									borderBottomWidth: '0'
								})
							}
						}}
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
						appearance="button"
						feedback="danger"
						background="surface.deep"
						checked={selectedTab === 'deleted-branches'}
						role="tab"
						onchange={goToDeletedBranches}
						passThrough={{
							root: {
								style: css.raw({
									borderBottomRadius: '0',
									borderBottomWidth: '0'
								})
							}
						}}
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
		{/key}
	</div>
	<div
		class={css({
			padding: 'sm',
			// The options trigger sits at the window's right edge; `bottom-end`
			// aligns the menu to the trigger's right edge, so the menu inherits the
			// trigger's distance from the edge (nothing overflows — flip/shift are
			// working). Extra right padding moves the trigger, and with it the
			// end-aligned menu, inward so it clears the list scrollbar.
			pr: 'xl'
		})}
	>
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

		<Menu
			placement="bottom-end"
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
				<Tooltip content="Repository options" placement="left">
					{#snippet children(tipProps)}
						<Button
							emphasis="secondary"
							shape="square"
							data-testid="repository-options-button"
							{...props}
							{...tipProps}
						>
							<Stamp emphasis="ghost" border="none" background="transparent">
								<Icon icon="lucide:ellipsis-vertical" width="20px" height="20px" />
							</Stamp>
						</Button>
					{/snippet}
				</Tooltip>
			{/snippet}
		</Menu>

		<RemoveRepositoryModal {repositoryId} bind:open={removeModalOpen} />
	</div>
</div>
