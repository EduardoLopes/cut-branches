<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Loading from '@pindoba/svelte-loading';
	import Pagination from '@pindoba/svelte-pagination';
	import Branch from '$domains/branch-management/components/branch.svelte';
	import LockBranchToggle from '$domains/branch-management/components/lock-branch-toggle.svelte';
	import { createLockedBranchesQuery } from '$domains/branch-management/services/createLockedBranchesQuery';
	import {
		createAddSelectedBranchesMutation,
		createRemoveSelectedBranchesMutation
	} from '$domains/branch-management/services/createSelectedBranchesMutations';
	import { createSelectedBranchesQuery } from '$domains/branch-management/services/createSelectedBranchesQuery';
	import { createSwitchBranchMutation } from '$domains/branch-management/services/createSwitchBranchMutation';
	import { notifications } from '$domains/notifications/store/notifications.svelte';
	import { getRepositoryStore } from '$domains/repository-management/store/repository.svelte';
	import type { Branch as BranchType } from '$services/common';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';
	import { token } from '@pindoba/panda/tokens';

	interface Props {
		branches: BranchType[];
		currentBranch?: string;
		repositoryID?: string;
		allowLocking?: boolean;
		allowSelection?: boolean;
		allowSetCurrent?: boolean;
	}

	const {
		branches = [],
		currentBranch = '',
		repositoryID,
		allowLocking = true,
		allowSelection = true,
		allowSetCurrent = true
	}: Props = $props();

	const repository = $derived(getRepositoryStore(repositoryID));

	const selectedQueryInput = $derived({ repoId: repositoryID ?? '' });
	const lockedQueryInput = $derived({ repoId: repositoryID ?? '' });

	// Use queries for database-backed data
	const lockedQuery = $derived(createLockedBranchesQuery(lockedQueryInput));
	const selectedQuery = $derived(createSelectedBranchesQuery(selectedQueryInput));

	// Mutations for selected branches
	const addSelectedMutation = $derived(createAddSelectedBranchesMutation());

	const removeSelectedMutation = $derived(createRemoveSelectedBranchesMutation());

	const switchBranchMutation = $derived(
		createSwitchBranchMutation({
			onSuccess: ({ currentBranch }) => {
				notifications.push({
					title: 'Branch switched',
					message: `Successfully switched to branch **${currentBranch}**`,
					feedback: 'success'
				});

				// Remove from selected branches in database - invalidation happens automatically
				if (repositoryID) {
					removeSelectedMutation.mutate({ repoId: repositoryID, branchNames: [currentBranch] });
				}
			},
			meta: { showErrorNotification: true }
		})
	);
	function handleToggleSelect(branch: string) {
		if (!repositoryID) return;

		if (selectedQuery.data?.branches.includes(branch)) {
			removeSelectedMutation.mutate({ repoId: repositoryID, branchNames: [branch] });
		} else {
			addSelectedMutation.mutate({ repoId: repositoryID, branchNames: [branch] });
		}
	}

	function handleSwitchBranch(branch: string) {
		if (repository?.state?.path) {
			switchBranchMutation.mutate({
				path: repository?.state?.path,
				branch
			});
		}
	}

	let currentPage = $state(1);
	let itemsPerPage = $state(10);

	let start = $derived(Math.max(0, itemsPerPage * (currentPage - 1)));
	let end = $derived(start + itemsPerPage);
	let paginatedBranches = $derived(branches?.slice(start, end));
</script>

<div
	class={css({
		display: 'flex',
		flexDirection: 'column',
		flex: 1
	})}
>
	<div
		role="list"
		class={css({
			display: 'flex',
			flexDirection: 'column',
			gap: 'md',
			padding: 'md',
			zIndex: '0',
			width: 'full'
		})}
	>
		{#if paginatedBranches}
			{#each paginatedBranches as branch (`${branch.name}-${branch.lastCommit.sha}`)}
				<div
					role="listitem"
					class={css({
						position: 'relative',
						display: 'grid',
						gridTemplateColumns: 'auto 1fr',
						gap: 'sm',
						borderRadius: 'sm'
					})}
					class:selected={selectedQuery.data?.branches.includes(branch.name)}
				>
					{#if currentBranch !== branch.name}
						<div
							class={css({
								display: 'flex',
								flexDirection: 'column',
								gap: 'xs'
							})}
						>
							{#if allowSelection}
								<Checkbox
									id={`checkbox-${branch.name}`}
									onclick={() => handleToggleSelect(branch.name)}
									checked={selectedQuery.data?.branches.includes(branch.name)}
									disabled={lockedQuery.data?.branches.includes(branch.name)}
								>
									<div class={visuallyHidden()}>
										{branch.name}
									</div>
								</Checkbox>
							{/if}

							{#if allowSetCurrent}
								<Loading
									isLoading={switchBranchMutation.variables?.branch === branch.name &&
										switchBranchMutation.isPending}
								>
									<Button
										size="xs"
										shape="square"
										emphasis="secondary"
										disabled={switchBranchMutation.variables?.branch !== branch.name &&
											switchBranchMutation.isPending}
										class={css({
											width: '26px',
											height: '26px',
											boxShadow: 'none'
										})}
										onclick={() => handleSwitchBranch(branch.name)}
										data-testid="switch-button"
										title="Set as current"
									>
										<Icon icon="lucide:map-pin" width="14px" height="14px" />
										<span class={visuallyHidden()}>Set as current</span>
									</Button>
								</Loading>
							{/if}

							{#if allowLocking}
								<LockBranchToggle {repositoryID} branch={branch.name} />
							{/if}
						</div>
					{/if}

					{#if currentBranch === branch.name}
						<div
							class={css({
								display: 'flex',
								width: '100%',
								flexDirection: 'column',
								gap: 'sm'
							})}
						>
							<span title="Current branch">
								<Icon
									icon="lucide:map-pin"
									width="24px"
									height="24px"
									color={token('colors.primary.800')}
								/>
							</span>
							{#if allowLocking}
								<LockBranchToggle {repositoryID} branch={branch.name} />
							{/if}
						</div>
					{/if}

					<Branch
						data={branch}
						selected={selectedQuery.data?.branches.includes(branch.name)}
						locked={lockedQuery.data?.branches.includes(branch.name) &&
							currentBranch !== branch.name}
					/>
				</div>
			{/each}
		{/if}
	</div>

	{#if branches.length > 0}
		<div
			class={css({
				p: 'md',
				translucent: 'md',
				bottom: '0',
				position: 'sticky',
				mt: 'auto',
				_dark: {
					borderTop: '1px solid token(colors.neutral.200)'
				},
				_light: {
					borderTop: '1px solid token(colors.neutral.400)'
				}
			})}
		>
			<Pagination itemsTotal={branches?.length ?? 0} bind:itemsPerPage bind:currentPage />
		</div>
	{/if}
</div>
