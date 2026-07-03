<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Loading from '@pindoba/svelte-loading';
	import Pagination from '@pindoba/svelte-pagination';
	import Stamp from '@pindoba/svelte-stamp';
	import Tooltip from '@pindoba/svelte-tooltip';
	import { getSearchBranchesStore } from '../core/composables/search-branches.svelte';
	import { page } from '$app/state';
	import BranchAlerts from '$domains/branch-management/components/branch-alerts.svelte';
	import LockBranchToggle from '$domains/branch-management/components/lock-branch-toggle.svelte';
	import { type Branch } from '$domains/branch-management/core/models/branch';
	import { createSwitchBranchMutation } from '$domains/branch-management/infrastructure/mutations/create-switch-branch-mutation';
	import { createUpdateBranchSelectionBatchMutation } from '$domains/branch-management/infrastructure/mutations/create-update-branch-selection-batch-mutation';
	import { createBranchMergeStatusQuery } from '$domains/branch-management/infrastructure/queries/create-branch-merge-status-query';
	import { createGetBranchesQuery } from '$domains/branch-management/infrastructure/queries/create-get-branches-query';
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

	const switchBranchMutation = createSwitchBranchMutation({
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
		}
	});

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

	let currentPage = $state(0);
	let itemsPerPage = $state(10);

	let start = $derived(Math.max(0, itemsPerPage * currentPage));
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
		flex: 1,
		background: 'neutral.surface.deep'
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
									size="lg"
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
									loading={switchBranchMutation.variables?.branch === branch.getName() &&
										switchBranchMutation.isPending}
								>
									<Tooltip content="Set as current">
										{#snippet children(triggerProps)}
											<Button
												size="xs"
												shape="square"
												emphasis="secondary"
												disabled={switchBranchMutation.variables?.branch !== branch.getName() &&
													switchBranchMutation.isPending}
												class={css({
													width: '24px',
													height: '24px'
												})}
												onclick={() => handleSwitchBranch(branch.getName())}
												data-testid="switch-button"
												{...triggerProps}
											>
												<Stamp emphasis="ghost" border="none" background="transparent">
													<Icon icon="lucide:map-pin" width="14px" height="14px" />
												</Stamp>
												<span class={visuallyHidden()}>Set as current</span>
											</Button>
										{/snippet}
									</Tooltip>
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
							<Tooltip content="Current branch">
								{#snippet children(triggerProps)}
									<Stamp feedback="primary" size="sm" shape="circle" {...triggerProps}>
										<Icon icon="lucide:map-pin" width="10px" height="10px" />
									</Stamp>
								{/snippet}
							</Tooltip>
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
					background: 'neutral.surface.soft/50 !important'
				}),
				css.raw({
					p: 'md',
					bottom: '0',
					position: 'sticky',
					mt: 'auto',
					borderTop: '1px solid token(colors.neutral.border.muted)'
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
