<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Group from '@pindoba/svelte-group';
	import Loading from '@pindoba/svelte-loading';
	import Pagination from '@pindoba/svelte-pagination';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { intlFormat, intlFormatDistance } from 'date-fns';
	import { onMount, onDestroy } from 'svelte';
	import Markdown from 'svelte-exmarkdown';
	import { navigating, page } from '$app/stores';
	import BranchComponent from '$lib/components/branch.svelte';
	import BulkActions from '$lib/components/branches-bulk-actions.svelte';
	import LockBranchToggle from '$lib/components/lock-branch-toggle.svelte';
	import NotificationsPopover from '$lib/components/notifications-popover.svelte';
	import RemoveRepositoryModal from '$lib/components/remove-repository-modal.svelte';
	import { createSwitchbranchMutation } from '$lib/services/createSwitchBranchMutation';
	import { getRepoByPath } from '$lib/services/getRepoByPath';
	import { getLockedBranchesStore } from '$lib/stores/locked-branches.svelte';
	import { notifications } from '$lib/stores/notifications.svelte';
	import { repositories } from '$lib/stores/repositories.svelte';
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

	const currentRepo = $derived(repositories.findById(id));
	const search = $derived(getSearchBranchesStore(currentRepo?.name));
	const locked = $derived(getLockedBranchesStore(currentRepo?.name));
	const selected = $derived(getSelectedBranchesStore(currentRepo?.name));

	const getBranchesQuery = getRepoByPath(() => currentRepo?.path, {
		staleTime: oneMinute,
		meta: {
			showErrorNotification: false
		}
	});

	const switchBranchMutation = createSwitchbranchMutation({
		onSuccess: (currentBranch) => {
			notifications.push({
				title: 'Branch switched',
				message: `Successfully switched to branch **${currentBranch}**`,
				feedback: 'success'
			});

			selected.remove([currentBranch]);

			queryClient.invalidateQueries({ queryKey: ['branches', 'get-all', currentRepo?.path] });
		}
	});

	function handleSwitchBranch(branch: string) {
		if (currentRepo?.path) {
			switchBranchMutation.mutate({
				path: currentRepo.path,
				branch
			});
		}
	}

	function update_repo() {
		if (currentRepo) {
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
		search.clear();
		currentPage = 1;
	}

	let currentPage = $state(1);
	let itemsPerPage = $state(10);

	let branches = $derived(
		currentRepo
			? currentRepo?.branches.filter((item) =>
					item.name
						.toLowerCase()
						.trim()
						.includes((search.query ?? '').toLowerCase().trim())
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
		if (!branches || !currentRepo) {
			return 0;
		}
		return branches.filter(
			(item) => item.name !== currentRepo.currentBranch && !locked.has(item.name)
		).length;
	});

	let searchNoResultsFound = $derived((search.query?.length ?? 0) > 0 && branches?.length === 0);

	let lastUpdatedAtDate = $derived(
		getBranchesQuery.dataUpdatedAt ? new Date(getBranchesQuery.dataUpdatedAt) : undefined
	);

	let lastUpdatedAt = $state<string | undefined>();

	const updateLastUpdatedAt = () => {
		if (lastUpdatedAtDate) {
			lastUpdatedAt = intlFormatDistance(lastUpdatedAtDate, Date.now());
		}
	};

	let interval = $state<number | undefined>();

	onMount(() => {
		interval = window.setInterval(updateLastUpdatedAt, oneMinute);
	});

	$effect(updateLastUpdatedAt);

	onDestroy(() => {
		clearInterval(interval);
	});

	const hasNoBranchesToDelete = $derived(
		selectibleCount === 0 && currentRepo?.branches.length !== 0 && search.query?.length === 0
	);

	const selectedLength = $derived(
		currentRepo?.branches
			?.filter((item) => item.name !== currentRepo?.currentBranch)
			.filter((item) => selected.has(item.name)).length ?? 0
	);

	const selectedSearchLength = $derived(
		branches?.filter((item) => selected.has(item.name)).length ?? 0
	);
</script>

<main
	class={css({
		display: 'flex',
		flexDirection: 'column',
		_light: {
			background: 'neutral.200'
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
		{#key currentRepo?.name}
			<h2
				class={css({
					textStyle: '4xl',
					textTransform: 'uppercase'
				})}
			>
				{#if currentRepo?.name}
					{currentRepo?.name}
				{/if}
			</h2>
		{/key}

		<Loading isLoading={getBranchesQuery.isFetching}>
			<Group direction="horizontal">
				<Button emphasis="ghost" size="sm" onclick={update_repo} shape="square">
					<Icon icon="material-symbols:refresh-rounded" width="24px" height="24px" />
					<span class={visuallyHidden()}>Update</span>
				</Button>

				{#if currentRepo}
					<RemoveRepositoryModal {currentRepo} />
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
					{currentRepo}
					{selectibleCount}
					{selectedLength}
					{selectedSearchLength}
					{branches}
					onSearch={() => {
						currentPage = 1;
					}}
					onClearSearch={clearSearch}
				/>
			{/if}

			{#if getBranchesQuery.isSuccess}
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
								fontSize: 'lg'
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
								<div>No results for <b>{search.query}</b>!</div>
							</div>
						</div>
					{/if}

					{#if currentRepo?.branches.length === 0}
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

					{#key `${$page.params.id}${currentPage}`}
						<div
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
										class={css({
											position: 'relative',
											display: 'grid',
											gridTemplateColumns: 'auto 1fr',
											gap: 'sm',
											borderRadius: 'sm'
										})}
										class:selected={selected.has(branch.name)}
									>
										{#if currentRepo?.currentBranch !== branch.name}
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
														if (selected.has(branch.name)) {
															selected.remove([branch.name]);
														} else {
															selected.add([branch.name]);
														}
													}}
													checked={selected.has(branch.name)}
													disabled={locked.has(branch.name)}
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
													>
														<Icon icon="octicon:feed-star-16" width="12px" height="12px" />
														<span class={visuallyHidden()}>Set as current</span>
													</Button>
												</Loading>
												<LockBranchToggle repositoryID={id} branch={branch.name} />
											</div>
										{/if}

										{#if currentRepo?.currentBranch === branch.name}
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
											selected={selected.has(branch.name)}
											locked={locked.has(branch.name) && currentRepo?.currentBranch !== branch.name}
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
							{#if currentRepo?.branches && !searchNoResultsFound}
								<div
									class={css({
										p: 'md',
										translucent: 'md'
									})}
								>
									<Pagination
										itemsTotal={branches?.length ?? 0}
										bind:itemsPerPage
										bind:currentPage
									/>
								</div>
							{/if}
						</div>
					</div>
				</div>
				<!-- BRANCHES END -->
			{/if}
		</div>
	</Loading>
	<div
		class={css({
			_dark: {
				background: 'primary.100',
				borderTop: '1px dashed token(colors.primary.300)'
			},
			_light: {
				background: 'primary.800',
				borderTop: '1px dashed token(colors.primary.400)'
			},
			height: 'calc((token(spacing.sm)) * 2.5)',
			p: 'token(spacing.xxs)',
			display: 'flex',
			justifyContent: 'flex-end',
			alignItems: 'center',
			gap: 'md'
		})}
	>
		{#if lastUpdatedAt && lastUpdatedAtDate}
			<time
				datetime={lastUpdatedAtDate.toISOString()}
				title={intlFormat(lastUpdatedAtDate, {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
					hour: 'numeric',
					minute: 'numeric',
					second: 'numeric'
				})}
			>
				{#key lastUpdatedAt}
					<div
						class={css({
							fontSize: 'sm',
							_dark: {
								color: 'primary.900'
							},
							_light: {
								color: 'primary.600'
							}
						})}
					>
						Last updated {lastUpdatedAt}
					</div>
				{/key}
			</time>
		{/if}
		<NotificationsPopover />
	</div>
</main>
