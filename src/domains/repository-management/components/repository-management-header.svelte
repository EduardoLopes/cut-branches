<script lang="ts">
	import Badge from '@pindoba/svelte-badge';
	import Group from '@pindoba/svelte-group';
	import Radio from '@pindoba/svelte-radio';
	import { onMount } from 'svelte';
	import { createGetBranchesQuery } from '../core/composables/queries/create-get-branches-query';
	import { createGetRepositoryQuery } from '../core/composables/queries/create-get-repository-query';
	import RemoveRepositoryModal from './remove-repository-modal.svelte';
	import UpdateRepositoryButton from './update-repository-button.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
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

	let selectedTab = $state('active-branches');

	onMount(() => {
		if (page.url.pathname.includes('restore')) {
			selectedTab = 'deleted-branches';
		} else {
			selectedTab = 'active-branches';
		}
	});
</script>

<div
	class={css({
		display: 'flex',
		justifyContent: 'space-between',
		top: '0',
		zIndex: '20',
		flexShrink: '0',
		px: 'md',
		pt: 'md'
	})}
>
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
					textStyle: '4xl'
				})}
				data-testid="repository-name"
			>
				{#if getRepositoryQuery.data?.name}
					<span
						class={css({
							textTransform: 'uppercase'
						})}
					>
						{getRepositoryQuery.data.name}
					</span>
				{/if}
			</h2>
			<div
				class={css({
					display: 'flex',
					alignItems: 'flex-end',
					justifyContent: 'flex-end'
				})}
			>
				<Group direction="horizontal" noBorderRadius="bottom">
					<Radio
						id="branches"
						name="repository-management"
						value="active-branches"
						appearance="tab-horizontal"
						checked={selectedTab === 'active-branches'}
						role="tab"
						onchange={goToBranches}
					>
						Branches <Badge size="sm">{activeBranchesCount}</Badge>
					</Radio>
					<Radio
						id="deleted-branches"
						name="repository-management"
						value="restore"
						appearance="tab-horizontal"
						feedback="danger"
						checked={selectedTab === 'deleted-branches'}
						role="tab"
						onchange={goToDeletedBranches}
					>
						Restore <Badge size="sm" feedback="danger">{deletedBranchesCount}</Badge>
					</Radio>
				</Group>
			</div>
		{/key}
	</div>

	<Group direction="horizontal">
		<UpdateRepositoryButton {repositoryId} />
		<RemoveRepositoryModal {repositoryId} />
	</Group>
</div>
