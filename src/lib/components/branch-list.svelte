<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Loading from '@pindoba/svelte-loading';
	import Pagination from '@pindoba/svelte-pagination';
	import { useQueryClient } from '@tanstack/svelte-query';
	import Branch from '$lib/components/branch.svelte';
	import LockBranchToggle from '$lib/components/lock-branch-toggle.svelte';
	import type { Branch as BranchType } from '$lib/services/common';
	import { createSwitchBranchMutation } from '$lib/services/createSwitchBranchMutation';
	import { getLockedBranchesStore } from '$lib/stores/locked-branches.svelte';
	import { notifications } from '$lib/stores/notifications.svelte';
	import { getRepositoryStore } from '$lib/stores/repository.svelte';
	import { getSelectedBranchesStore } from '$lib/stores/selected-branches.svelte';
	import type { SetStore } from '$lib/utils/set-store.svelte';
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
		selectedStore?: SetStore<string>;
		branchesType?: 'current' | 'deleted';
	}

	const {
		branches = [],
		currentBranch = '',
		repositoryID,
		allowLocking = true,
		allowSelection = true,
		allowSetCurrent = true,
		selectedStore,
		branchesType = 'current'
	}: Props = $props();

	const queryClient = useQueryClient();

	const repository = $derived(getRepositoryStore(repositoryID));
	const locked = $derived(getLockedBranchesStore(repositoryID));
	const selected = $derived(selectedStore ?? getSelectedBranchesStore(repositoryID));

	const switchBranchMutation = createSwitchBranchMutation({
		onSuccess: (currentBranch) => {
			notifications.push({
				title: 'Branch switched',
				message: `Successfully switched to branch **${currentBranch}**`,
				feedback: 'success'
			});

			selected?.delete([currentBranch]);

			queryClient.invalidateQueries({
				queryKey: ['branches', 'get-all', repository?.state?.path],
				refetchType: 'all'
			});
		},
		meta: { showErrorNotification: true }
	});

	function handleToggleSelect(branch: string) {
		if (selected?.has(branch)) {
			selected?.delete([branch]);
		} else {
			selected?.add([branch]);
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
					class:selected={selected?.has(branch.name)}
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
									checked={selected?.has(branch.name)}
									disabled={locked?.has(branch.name)}
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
						selected={branchesType === 'deleted' ? true : selected?.has(branch.name)}
						locked={locked?.has(branch.name) && currentBranch !== branch.name}
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
