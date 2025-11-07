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
	import { createSwitchBranchMutation } from '$domains/branch-management/core/composables/create-switch-branch-mutation';
	import { createUpdateBranchSelectionBatchMutation } from '$domains/branch-management/core/composables/create-update-branch-selection-batch-mutation';
	import { type Branch } from '$domains/branch-management/core/models/branch';
	import {
		getBranchColorPalette,
		getBranchAlerts,
		getBranchElementId,
		shouldShowBranchAlerts
	} from '$domains/branch-management/utils/branch-utils';
	import { notifications } from '$services/notifications/notifications.svelte';
	import BranchCard from '$ui/core/branch-card.svelte';
	import { formatString } from '$utils/string-utils';
	import { css } from '@pindoba/styled-system/css';
	import { translucent, visuallyHidden } from '@pindoba/styled-system/patterns';
	import { token } from '@pindoba/styled-system/tokens';

	interface Props {
		repositoryID?: string;
		repositoryPath?: string;
		allowLocking?: boolean;
		allowSelection?: boolean;
		allowSetCurrent?: boolean;
		showAlerts?: boolean;
		variant?: 'default' | 'inverted';
	}

	const {
		repositoryID,
		repositoryPath,
		allowLocking = true,
		allowSelection = true,
		allowSetCurrent = true,
		variant = 'default',
		showAlerts = true
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
			branchNames: [branch.getName()],
			isSelected: !branch.getIsSelected()
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
	let sortedBranches = $derived.by((): Branch[] | undefined => {
		const branches = branchesQuery.data?.branches;
		if (!branches) return undefined;

		return branches
			.toSorted((a, b) => {
				if (a.isCurrent() && !b.isCurrent()) return -1;
				if (!a.isCurrent() && b.isCurrent()) return 1;
				return 0;
			})
			.filter((branch) =>
				branch
					.getName()
					.toLowerCase()
					.includes(search?.state?.toLowerCase() ?? '')
			);
	});
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
			{#each paginatedBranches as branch (`${branch.getName()}-${branch.getLastCommit().getSha()}`)}
				<div
					role="listitem"
					class={css({
						position: 'relative',
						display: 'grid',
						gridTemplateColumns: 'auto 1fr',
						gap: 'sm',
						borderRadius: 'sm',
						borderTopLeftRadius: 0
					})}
					class:selected={branch.getIsSelected()}
				>
					{#if !branch.isCurrent()}
						<div
							class={css({
								display: 'flex',
								flexDirection: 'column',
								gap: 'xs'
							})}
						>
							{#if allowSelection && !branch.getIsLocked()}
								<Checkbox
									id={`checkbox-${branch.getName()}`}
									onclick={() => handleToggleSelect(branch)}
									checked={branch.getIsSelected()}
									disabled={branch.getIsLocked()}
								>
									<div class={visuallyHidden()}>
										{branch.getName()}
									</div>
								</Checkbox>
							{/if}

							{#if allowSetCurrent}
								<Loading
									isLoading={switchBranchMutation.variables?.branch === branch.getName() &&
										switchBranchMutation.isPending}
								>
									<Button
										size="xs"
										shape="square"
										emphasis="secondary"
										disabled={switchBranchMutation.variables?.branch !== branch.getName() &&
											switchBranchMutation.isPending}
										class={css({
											width: '26px',
											height: '26px',
											boxShadow: 'none'
										})}
										onclick={() => handleSwitchBranch(branch.getName())}
										data-testid="switch-button"
										title="Set as current"
									>
										<Icon icon="lucide:map-pin" width="14px" height="14px" />
										<span class={visuallyHidden()}>Set as current</span>
									</Button>
								</Loading>
							{/if}

							{#if allowLocking}
								<LockBranchToggle {repositoryID} branch={branch.getName()} />
							{/if}
						</div>
					{/if}

					{#if branch.isCurrent()}
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
								<LockBranchToggle {repositoryID} branch={branch.getName()} />
							{/if}
						</div>
					{/if}

					<BranchCard
						{branch}
						selected={branch.getIsSelected()}
						locked={branch.getIsLocked() && !branch.isCurrent()}
						colorPalette={getBranchColorPalette(branch, branch.getIsSelected() ?? false)}
						id={getBranchElementId(branch.getName(), 'container')}
						title={branch.isCurrent()
							? 'Current branch'
							: formatString('{name}', { name: branch.getName() })}
						{variant}
					>
						{@const mergeStatusQuery = createBranchMergeStatusQuery(
							{
								path: repositoryPath ?? '',
								branchName: branch.getName()
							},
							{
								enabled: !!repositoryPath && !branch.isCurrent()
							}
						)}
						{@const alerts = getBranchAlerts(
							branch,
							branch.getIsSelected() ?? false,
							mergeStatusQuery.data?.isMerged
						)}
						{#if showAlerts && shouldShowBranchAlerts(alerts, branch)}
							<BranchAlerts {alerts} {branch} />
						{/if}
					</BranchCard>
				</div>
			{/each}
		{/if}
	</div>

	{#if branchesQuery.data?.branches.length && branchesQuery.data?.branches.length > 0}
		<div
			class={css(
				translucent.raw({
					blur: 'md',
					background: 'neutral.alpha.50 !important'
				}),
				css.raw({
					p: 'md',
					bottom: '0',
					position: 'sticky',
					mt: 'auto',
					_dark: {
						borderTop: '1px solid token(colors.neutral.200)'
					},
					_light: {
						borderTop: '1px solid token(colors.neutral.400)'
					}
				})
			)}
		>
			<Pagination
				itemsTotal={branchesQuery.data?.branches.length}
				bind:itemsPerPage
				bind:page={currentPage}
			/>
		</div>
	{/if}
</div>
