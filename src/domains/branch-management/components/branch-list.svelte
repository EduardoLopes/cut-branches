<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Loading from '@pindoba/svelte-loading';
	import Pagination from '@pindoba/svelte-pagination';
	import { createGetBranchesQuery } from '../core/composables/create-get-branches-query';
	import { getSearchBranchesStore } from '../store/search-branches.svelte';
	import { page } from '$app/state';
	import BranchAlerts from '$domains/branch-management/components/branch-alerts.svelte';
	import LockBranchToggle from '$domains/branch-management/components/lock-branch-toggle.svelte';
	import { createBranchMergeStatusQuery } from '$domains/branch-management/core/composables/create-branch-merge-status-query';
	import { createUpdateBranchSelectionBatchMutation } from '$domains/branch-management/core/composables/create-selected-branches-mutations';
	import { createSwitchBranchMutation } from '$domains/branch-management/core/composables/create-switch-branch-mutation';
	import {
		getBranchColorPalette,
		getBranchAlerts,
		getBranchElementId,
		shouldShowBranchAlerts
	} from '$domains/branch-management/utils/branch-utils';
	import { notifications } from '$domains/notifications/store/notifications.svelte';
	import type { Branch } from '$lib/bindings';
	import BranchCard from '$ui/core/branch-card.svelte';
	import { formatString } from '$utils/string-utils';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';
	import { token } from '@pindoba/panda/tokens';

	interface Props {
		repositoryID?: string;
		repositoryPath?: string;
		allowLocking?: boolean;
		allowSelection?: boolean;
		allowSetCurrent?: boolean;
		variant?: 'default' | 'inverted';
	}

	const {
		repositoryID,
		repositoryPath,
		allowLocking = true,
		allowSelection = true,
		allowSetCurrent = true,
		variant = 'default'
	}: Props = $props();

	const search = $derived(
		getSearchBranchesStore(
			`${repositoryID}-${page.url.pathname.includes('restore') ? 'deleted' : 'active'}`
		)
	);

	const branchesQuery = createGetBranchesQuery(() => ({
		repoId: repositoryID ?? '',
		filters: {
			deletionStatus: page.url.pathname.includes('restore')
				? ('deleted' as const)
				: ('active' as const),
			includeCurrent: true
		}
	}));

	// Unified mutation for selected branches
	const updateSelectionMutation = createUpdateBranchSelectionBatchMutation();

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
					updateSelectionMutation.mutate({
						repoId: repositoryID,
						branchNames: [currentBranch],
						isSelected: false
					});
				}
			},
			meta: { showErrorNotification: true }
		})
	);
	function handleToggleSelect(branch: Branch) {
		if (!repositoryID) return;

		updateSelectionMutation.mutate({
			repoId: repositoryID,
			branchNames: [branch.name],
			isSelected: !branch.isSelected
		});
	}

	function handleSwitchBranch(branch: string) {
		if (repositoryPath) {
			switchBranchMutation.mutate({
				path: repositoryPath,
				branch
			});
		}
	}

	let currentPage = $state(1);
	let itemsPerPage = $state(10);

	let start = $derived(Math.max(0, itemsPerPage * (currentPage - 1)));
	let end = $derived(start + itemsPerPage);
	let sortedBranches = $derived(
		branchesQuery.data?.branches
			.toSorted((a, b) => {
				if (a.current && !b.current) return -1;
				if (!a.current && b.current) return 1;
				return 0;
			})
			.filter((branch) => branch.name.toLowerCase().includes(search?.state?.toLowerCase() ?? ''))
	);
	let paginatedBranches = $derived(sortedBranches?.slice(start, end));
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
					class:selected={branch.isSelected}
				>
					{#if !branch.current}
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
									onclick={() => handleToggleSelect(branch)}
									checked={branch.isSelected}
									disabled={branch.isLocked}
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

					{#if branch.current}
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

					<BranchCard
						{branch}
						selected={branch.isSelected}
						locked={branch.isLocked && !branch.current}
						colorPalette={getBranchColorPalette(branch, branch.isSelected ?? false)}
						id={getBranchElementId(branch.name, 'container')}
						title={branch.current
							? 'Current branch'
							: formatString('{name}', { name: branch.name })}
						{variant}
					>
						{@const mergeStatusQuery = createBranchMergeStatusQuery(
							{
								path: repositoryPath ?? '',
								branchName: branch.name
							},
							{
								enabled: !!repositoryPath && !branch.current
							}
						)}
						{@const alerts = getBranchAlerts(
							branch,
							branch.isSelected ?? false,
							mergeStatusQuery.data?.isMerged
						)}
						{#if shouldShowBranchAlerts(alerts, branch)}
							<BranchAlerts {alerts} {branch} />
						{/if}
					</BranchCard>
				</div>
			{/each}
		{/if}
	</div>

	{#if branchesQuery.data?.branches.length && branchesQuery.data?.branches.length > 0}
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
			<Pagination
				itemsTotal={branchesQuery.data?.branches.length}
				bind:itemsPerPage
				bind:currentPage
			/>
		</div>
	{/if}
</div>
