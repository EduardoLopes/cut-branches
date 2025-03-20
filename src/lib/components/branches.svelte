<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Group from '@pindoba/svelte-group';
	import Loading from '@pindoba/svelte-loading';
	import Pagination from '@pindoba/svelte-pagination';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { onDestroy } from 'svelte';
	import Markdown from 'svelte-exmarkdown';
	import { navigating } from '$app/stores';
	import BranchComponent from '$lib/components/branch.svelte';
	import BulkActions from '$lib/components/branches-bulk-actions.svelte';
	import LockBranchToggle from '$lib/components/lock-branch-toggle.svelte';
	import RemoveRepositoryModal from '$lib/components/remove-repository-modal.svelte';
	import { createGetRepositoryByPathQuery } from '$lib/services/createGetRepositoryByPathQuery';
	import { createSwitchbranchMutation } from '$lib/services/createSwitchBranchMutation';
	import { globalStore } from '$lib/stores/global-store.svelte';
	import { getLockedBranchesStore } from '$lib/stores/locked-branches.svelte';
	import { notifications } from '$lib/stores/notifications.svelte';
	import { getRepositoryStore } from '$lib/stores/repository.svelte';
	import { getSearchBranchesStore } from '$lib/stores/search-branches.svelte';
	import { getSelectedBranchesStore } from '$lib/stores/selected-branches.svelte';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';
	import { token } from '@pindoba/panda/tokens';

	const queryClient = useQueryClient();

	interface Props {
		id?: string;
	}
	const { id }: Props = $props();

	const oneMinute = 60000;

	const repository = $derived(getRepositoryStore(id));
	const search = $derived(getSearchBranchesStore(id));
	const locked = $derived(getLockedBranchesStore(id));
	const selected = $derived(getSelectedBranchesStore(id));

	const getBranchesQuery = createGetRepositoryByPathQuery(() => repository?.state?.path, {
		staleTime: oneMinute
	});

	$effect(() => {
		if (repository?.state?.path) {
			globalStore.lastUpdatedAt = new Date(getBranchesQuery.dataUpdatedAt);
		}
	});

	const switchBranchMutation = createSwitchbranchMutation({
		onSuccess: (currentBranch) => {
			notifications.push({
				title: 'Branch switched',
				message: `Successfully switched to branch **${currentBranch}**`,
				feedback: 'success'
			});

			selected?.delete([currentBranch]);

			queryClient.invalidateQueries({ queryKey: ['branches', 'get-all', repository?.state?.path] });
		},
		meta: { showErrorNotification: true }
	});

	onDestroy(() => {
		clearInterval(interval);
		globalStore.lastUpdatedAt = undefined;
	});

	function handleSwitchBranch(branch: string) {
		if (repository?.state?.path) {
			switchBranchMutation.mutate({
				path: repository?.state?.path,
				branch
			});
		}
	}

	function update_repo() {
		if (repository?.state) {
			getBranchesQuery.refetch().then((query) => {
				notifications.push({
					title: 'Repository updated',
					message: `The repository **${query.data?.name}** was updated`,
					feedback: 'success'
				});
			});
		}
	}

	function clearSearch() {
		search?.clear();
		currentPage = 1;
	}

	let currentPage = $state(1);
	let itemsPerPage = $state(10);

	let branches = $derived(
		repository?.state
			? repository?.state?.branches.filter((item) =>
					item.name
						.toLowerCase()
						.trim()
						.includes((search?.state ?? '').toLowerCase().trim())
				)
			: []
	);

	let start = $derived(Math.max(0, itemsPerPage * (currentPage - 1)));
	let end = $derived(start + itemsPerPage);
	let paginatedBranches = $derived(branches?.slice(start, end));

	$effect(() => {
		if ($navigating) {
			currentPage = 1;
		}
	});

	let selectibleCount = $derived.by(() => {
		if (!branches || !repository?.state) {
			return 0;
		}
		return branches.filter(
			(item) => item.name !== repository?.state?.currentBranch && !locked?.has(item.name)
		).length;
	});

	let searchNoResultsFound = $derived((search?.state?.length ?? 0) > 0 && branches?.length === 0);

	let interval = $state<number | undefined>();

	onDestroy(() => {
		clearInterval(interval);
	});

	const hasNoBranchesToDelete = $derived(
		selectibleCount === 0 && (search?.state ?? '')?.length === 0
	);

	const selectedSearchLength = $derived(
		branches?.filter((item) => selected?.has(item.name)).length ?? 0
	);
</script>

<main
	class={css({
		display: 'flex',
		flexDirection: 'column',
		_light: {
			background: 'neutral.400'
		},
		_dark: {
			background: 'neutral.50'
		},
		overflow: 'hidden',
		position: 'relative',
		height: '100%'
	})}
>
	<!-- TOP BAR -->
	<div
		class={css({
			display: 'flex',
			position: 'sticky',
			justifyContent: 'space-between',
			top: '0',
			_dark: {
				background: 'neutral.100',
				borderBottom: '1px dashed token(colors.neutral.300)'
			},
			_light: {
				background: 'neutral.50',
				borderBottom: '1px dashed token(colors.neutral.400)'
			},
			alignItems: 'center',
			zIndex: '20',
			flexShrink: '0',
			px: 'md',
			height: 'calc((token(spacing.xl)) * 2.5)'
		})}
	>
		{#key repository?.state?.name}
			<h2
				class={css({
					textStyle: '4xl',
					textTransform: 'uppercase'
				})}
			>
				{#if repository?.state?.name}
					{repository?.state?.name}
				{/if}
			</h2>
		{/key}

		<Loading isLoading={getBranchesQuery.isFetching}>
			<Group direction="horizontal">
				<Button
					emphasis="ghost"
					size="sm"
					onclick={update_repo}
					shape="square"
					data-testid="update-button"
				>
					<Icon icon="material-symbols:refresh-rounded" width="24px" height="24px" />
					<span class={visuallyHidden()}>Update</span>
				</Button>

				{#if repository?.state}
					<RemoveRepositoryModal currentRepo={repository?.state} />
				{/if}
			</Group>
		</Loading>
	</div>

	<!-- TOP BAR END -->
	<Loading
		isLoading={getBranchesQuery.isLoading}
		fillParent
		passThrough={{
			root: css.raw({
				borderRadius: '0'
			}),
			overlay: css.raw({
				borderRadius: '0',
				border: 'none'
			})
		}}
	>
		<!-- GERAL -->
		<div
			class={css({
				display: 'flex',
				flexDirection: 'column',
				width: '100%',
				height: 'calc(100vh - (token(spacing.sm) * 2.5 + token(spacing.xl) * 2.5))',
				overflowY: 'auto',
				overflowX: 'hidden'
			})}
		>
			<!-- ERRO MESSAGE -->
			{#if getBranchesQuery.isError}
				<div
					class={css({
						display: 'grid',
						placeItems: 'center',
						height: '100%',
						fontSize: '2rem',
						flexDirection: 'column',
						gap: '1.6rem'
					})}
				>
					<div
						class={css({
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: '1.6rem',
							maxWidth: '500px',
							textAlign: 'center'
						})}
					>
						<Icon
							icon="material-symbols:dangerous-rounded"
							width="64px"
							height="64px"
							color={token('colors.danger.700')}
						/>
						<div class="message"><Markdown md={getBranchesQuery.error.message} /></div>
						{#if getBranchesQuery.error.description}
							<div
								class={css({
									fontSize: '1.8rem',
									textAlign: 'center',
									color: 'neutral.900'
								})}
							>
								<Markdown md={getBranchesQuery.error.description} />
							</div>
						{/if}
					</div>
				</div>
			{/if}
			<!-- ERRO MESSAGE END -->
			{#if !hasNoBranchesToDelete}
				<BulkActions
					currentRepo={repository?.state}
					{selectibleCount}
					{selectedSearchLength}
					{branches}
					onSearch={() => {
						currentPage = 1;
					}}
					onClearSearch={clearSearch}
				/>
			{/if}

			<!-- BRANCHES -->
			<div
				class={css({
					display: 'flex',
					flexDirection: 'column',
					flexGrow: '1'
				})}
			>
				{#if hasNoBranchesToDelete}
					<div
						class={css({
							display: 'flex',
							alignItems: 'center',
							padding: 'md',
							fontSize: 'md'
						})}
					>
						This repository has no branches to delete.
					</div>
				{/if}

				{#if searchNoResultsFound}
					<div
						class={css({
							display: 'grid',
							placeItems: 'center',
							height: '100%',
							fontSize: '2rem',
							flexDirection: 'column',
							gap: '1.6rem'
						})}
					>
						<div
							class={css({
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: '1.6rem',
								maxWidth: '500px',
								textAlign: 'center'
							})}
						>
							<Icon
								icon="material-symbols:search-off"
								width="64px"
								height="64px"
								color={token('colors.danger.700')}
							/>
							<div data-testid="no-results-message">No results for <b>{search?.state}</b>!</div>
						</div>
					</div>
				{/if}

				{#if repository?.state?.branches.length === 0}
					<div
						class={css({
							display: 'grid',
							placeItems: 'center',
							height: '100%',
							fontSize: '2rem',
							flexDirection: 'column',
							gap: '1.6rem'
						})}
					>
						<div
							class={css({
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: '1.6rem',
								maxWidth: '500px',
								textAlign: 'center'
							})}
						>
							<Icon
								icon="mdi:source-branch-remove"
								width="64px"
								height="64px"
								color={token('colors.danger.700')}
							/>
							<div>This repository has no branches!</div>
						</div>
					</div>
				{/if}

				{#key `${id}${currentPage}`}
					<div
						role="list"
						class={css({
							display: 'flex',
							flexDirection: 'column',
							gridAutoRows: 'max-content',
							gap: 'md',
							padding: 'md',
							paddingTop: '0',
							zIndex: '0',
							height: '100%',
							width: 'full'
						})}
					>
						{#if paginatedBranches}
							{#each paginatedBranches as branch (`${branch.name}-${currentPage}`)}
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
									{#if repository?.state?.currentBranch !== branch.name}
										<div
											class={css({
												display: 'flex',
												flexDirection: 'column',
												gap: 'xs'
											})}
										>
											<Checkbox
												id={`checkbox-${branch.name}`}
												onclick={() => {
													if (selected?.has(branch.name)) {
														selected?.delete([branch.name]);
													} else {
														selected?.add([branch.name]);
													}
												}}
												checked={selected?.has(branch.name)}
												disabled={locked?.has(branch.name)}
											>
												<div class={visuallyHidden()}>
													{branch.name}
												</div>
											</Checkbox>
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
												>
													<Icon icon="octicon:feed-star-16" width="12px" height="12px" />
													<span class={visuallyHidden()}>Set as current</span>
												</Button>
											</Loading>
											<LockBranchToggle repositoryID={id} branch={branch.name} />
										</div>
									{/if}

									{#if repository?.state?.currentBranch === branch.name}
										<div
											class={css({
												display: 'flex',
												width: '100%',
												flexDirection: 'column',
												gap: 'sm'
											})}
										>
											<Icon
												icon="octicon:feed-star-16"
												width="24px"
												height="24px"
												color={token('colors.primary.800')}
											/>
											<LockBranchToggle repositoryID={id} branch={branch.name} />
										</div>
									{/if}

									<BranchComponent
										data={branch}
										selected={selected?.has(branch.name) ?? false}
										locked={locked?.has(branch.name) &&
											repository?.state?.currentBranch !== branch.name}
									/>
								</div>
							{/each}
						{/if}
					</div>
				{/key}

				<div
					class={css({
						display: 'flex',
						flexDirection: 'column',
						bottom: 0,
						position: 'sticky'
					})}
				>
					<div class="bottom-toolbar">
						{#if repository?.state?.branches && !searchNoResultsFound}
							<div
								class={css({
									p: 'md',
									translucent: 'md'
								})}
							>
								<Pagination itemsTotal={branches?.length ?? 0} bind:itemsPerPage bind:currentPage />
							</div>
						{/if}
					</div>
				</div>
			</div>
			<!-- BRANCHES END -->
		</div>
	</Loading>
</main>
