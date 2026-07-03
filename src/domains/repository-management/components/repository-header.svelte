<script lang="ts">
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import Group from '@pindoba/svelte-group';
	import Loading from '@pindoba/svelte-loading';
	import Popover from '@pindoba/svelte-popover';
	import Radio from '@pindoba/svelte-radio';
	import Stamp from '@pindoba/svelte-stamp';
	import Tooltip from '@pindoba/svelte-tooltip';
	import { createGetBranchesQuery } from '../infrastructure/queries/create-get-branches-query';
	import RemoveRepositoryModal from './remove-repository-modal.svelte';
	import UpdateRepositoryButton from './update-repository-button.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { createGetRepositoryQuery } from '$infrastructure/queries/create-get-repository-query';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		repositoryId: string;
	}

	const { repositoryId }: Props = $props();

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
			padding: 'sm'
		})}
	>
		<Popover
			showCloseButton={false}
			background="surface.deep"
			passThrough={{
				root: {
					style: css.raw({
						width: '180px',
						// Concentric with the inner menu items: inner radius (md) + content padding (3xs)
						borderRadius: 'calc(var(--radii-md) + var(--spacing-3xs))'
					})
				},
				content: {
					style: css.raw({
						p: '3xs',
						gap: '3xs',
						flexDirection: 'column'
					})
				}
			}}
		>
			{#snippet trigger(props)}
				<Tooltip content="Repository options" placement="left">
					{#snippet children(tipProps)}
						<Button
							emphasis="secondary"
							shape="square"
							data-testid="update-button"
							{...props}
							{...tipProps}
						>
							<Icon icon="lucide:ellipsis-vertical" width="20px" height="20px" />
						</Button>
					{/snippet}
				</Tooltip>
			{/snippet}

			<UpdateRepositoryButton {repositoryId} />
			<RemoveRepositoryModal {repositoryId} />
		</Popover>
	</div>
</div>
