<script lang="ts">
	import type { Branch } from '$lib/stores/repos';
	import { repos } from '$lib/stores/repos';
	import Button from '@pindoba/svelte-button';
	import BranchComponent from '$lib/components/branch.svelte';
	import Icon from '@iconify/svelte';
	import Checkbox from '@pindoba/svelte-checkbox';
	import { navigating, page } from '$app/stores';
	import { getRepoByPath } from '$lib/services/getRepoByPath';
	import { intlFormat, intlFormatDistance } from 'date-fns';
	import Group from '@pindoba/svelte-group';
	import Loading from '@pindoba/svelte-loading';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';
	import { token } from '@pindoba/panda/tokens';
	import Pagination from '@pindoba/svelte-pagination';
	import RemoveRepositoryModal from '$lib/components/remove-repository-modal.svelte';
	import NotificationsPopover from '$lib/components/notifications-popover.svelte';
	import { createNotifications } from '$lib/stores/notifications';
	import { createSelected, selected } from '$lib/stores/selected';
	import DeleteBranchModal from '$lib/components/delete-branch-modal.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { createSearch } from '$lib/stores/search';
	import TextInput from '@pindoba/svelte-text-input';
	import { createSwitchbranchMutation } from '$lib/services/createSwitchBranchMutation';
	import { useQueryClient } from '@tanstack/svelte-query';
	import Markdown from 'svelte-exmarkdown';
	import LockBranchToggle from './lock-branch-toggle.svelte';
	import { getLockedBranchesStore } from '$lib/stores/locked-branches.svelte';

	const notifications = createNotifications();
	const queryClient = useQueryClient();

	interface Props {
		id?: string;
	}
	const { id }: Props = $props();
	const locked = getLockedBranchesStore(id);

	let selectedManager = $derived(createSelected(id));
	let { query, ...search } = $derived(createSearch(id));

	const selectedList = $derived(id ? ($selected[id] ?? []) : []);

	const oneMinute = 60000;

	const currentRepo = $derived($repos.filter((item) => item.id === id)[0]);
	const getBranchesQuery = getRepoByPath(() => currentRepo?.path ?? history.state.path, {
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

	// current branch first
	function sort(a: Branch, b: Branch) {
		if (a.current) {
			return -1;
		}
		if (b.current) {
			return 1;
		}
		// a must be equal to b
		return 0;
	}

	function update_repo() {
		if (currentRepo) {
			getBranchesQuery.refetch().then(() => {
				if (getBranchesQuery.isSuccess) {
					notifications.push({
						title: 'Repository updated',
						message: `The repository **${getBranchesQuery.data?.name}** was updated`,
						feedback: 'success'
					});
				}
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
		getBranchesQuery.data
			? [...getBranchesQuery.data.branches].sort(sort).filter((item) =>
					item.name
						.toLowerCase()
						.trim()
						.includes(($query ?? '').toLowerCase().trim())
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

	let selectibleCount = $derived(
		Math.max(
			0,
			branches?.filter(
				(item) => item.name !== getBranchesQuery.data?.current_branch && !locked.has(item.name)
			)?.length ?? 0
		)
	);

	let searchNoResultsFound = $derived(($query?.length ?? 0) > 0 && branches?.length === 0);

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
		selectibleCount === 0 && getBranchesQuery.data?.branches.length !== 0 && $query?.length === 0
	);

	const selectedLength = $derived(
		getBranchesQuery.data?.branches
			?.filter((item) => item.name !== getBranchesQuery.data?.current_branch)
			.filter((item) => selectedList.includes(item.name)).length ?? 0
	);

	const selectedSearchLength = $derived(
		branches?.filter((item) => selectedList.includes(item.name)).length ?? 0
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
		{#key getBranchesQuery.data?.name}
			<h2
				class={css({
					fontSize: 'xl',
					textAlign: 'left',
					textTransform: 'uppercase',
					fontWeight: 'bold',
					color: 'neutral.950'
				})}
			>
				{#if getBranchesQuery.data?.name}
					{getBranchesQuery.data?.name}
				{/if}
			</h2>
		{/key}

		<Loading isLoading={getBranchesQuery.isFetching}>
			<Group direction="horizontal">
				<Button emphasis="ghost" size="sm" onclick={update_repo} shape="square">
					<Icon icon="material-symbols:refresh-rounded" width="24px" height="24px" />
					<span class={visuallyHidden()}>Update</span>
				</Button>

				<RemoveRepositoryModal {currentRepo} />
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
				<!-- BULK ACTIONS -->
				<div
					class={css({
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						padding: 'md',
						zIndex: '10',
						flexShrink: '0',
						position: 'sticky',
						top: '0',
						translucent: 'md'
					})}
				>
					<div
						class={css({
							display: 'flex',
							flexDirection: 'row',
							alignItems: 'center',
							height: '100%',
							gap: 'md'
						})}
					>
						{#if selectibleCount > 0}
							{#key selectibleCount}
								<div
									class={css({
										display: 'flex',
										flexDirection: 'row',
										alignItems: 'center',
										height: '100%',
										gap: 'md'
									})}
								>
									<Checkbox
										id="select-all"
										indeterminate={selectedSearchLength !== selectibleCount &&
											selectedSearchLength > 0}
										onclick={() => {
											const indeterminate =
												selectedSearchLength !== selectibleCount && selectedSearchLength > 0;

											if (indeterminate || selectedSearchLength === 0) {
												selectedManager.add(
													branches
														?.map((item) => item.name)
														.filter(
															(item) =>
																item !== getBranchesQuery.data?.current_branch && !locked.has(item)
														) ?? []
												);
											} else {
												selectedManager.remove(
													branches
														?.map((item) => item.name)
														.filter((item) => item !== getBranchesQuery.data?.current_branch) ?? []
												);
											}
										}}
										checked={selectedSearchLength === selectibleCount}
									>
										<div class={visuallyHidden()}>Select all</div>
									</Checkbox>

									{#if $query?.length ?? 0 > 0}
										<div
											class={css({
												fontSize: 'md'
											})}
										>
											<span
												class={css({
													color: 'neutral.950.contrast'
												})}
											>
												{selectedLength}
											</span>
											are selected /
											<span
												class={css({
													color: 'neutral.950.contrast'
												})}
											>
												{selectibleCount}
											</span>
											{selectibleCount === 1 ? 'branch was' : 'branches were'} found for
											<strong
												class={css({
													color: 'primary.800'
												})}
											>
												{$query?.trim()}
											</strong>
										</div>
									{/if}

									{#if $query?.length === 0 || typeof $query === 'undefined'}
										{selectedLength} / {selectibleCount} branches
									{/if}
								</div>
							{/key}
						{/if}
					</div>

					<div
						class={css({
							display: 'flex',
							flexDirection: 'row',
							alignItems: 'center',
							gap: 'md'
						})}
					>
						{#if !hasNoBranchesToDelete && !getBranchesQuery.isError}
							<Group>
								<TextInput
									class={css({
										width: '130px'
									})}
									heightSize="sm"
									oninput={(event) => {
										const target = event.target as HTMLInputElement;
										search.set(String(target.value));
										currentPage = 1;
									}}
									autocorrect="off"
									placeholder="Search branches"
									bind:value={$query}
								/>
								<Button
									size="sm"
									onclick={() => {
										clearSearch();
									}}
									disabled={!$query}
								>
									<div
										class={css({
											display: 'flex',
											alignItems: 'center',
											gap: 'xs'
										})}
									>
										<Icon icon="mdi:clear" width="16px" height="16px" />
										<span class={visuallyHidden()}>Clear search</span>
									</div>
								</Button>
							</Group>
						{/if}
						{#if selectibleCount > 0}
							<div>
								<DeleteBranchModal {currentRepo} buttonProps={{ disabled: selectedLength === 0 }} />
							</div>
						{/if}
					</div>
				</div>
				<!-- BULK ACTIONS END -->
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
								<div>No results for <b>{$query}</b>!</div>
							</div>
						</div>
					{/if}

					{#if getBranchesQuery.data.branches.length === 0}
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
								padding: '16px',
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
											gridTemplateColumns: 'token(spacing.lg) auto',
											gap: 'md',
											borderRadius: 'sm'
										})}
										class:selected={selectedList.includes(branch.name)}
									>
										<!-- Nice animation that has bad performance -->
										<!-- in:fly={{
											x: -30,
											duration: 150,
											delay: 20 * (index + 1 / paginatedBranches.length)
										}}
										out:fly|local={{
											x: -30,
											duration: 150,
											delay: 20 * (index + 1 / paginatedBranches.length)
										}} -->

										{#if getBranchesQuery.data?.current_branch !== branch.name}
											<div
												class={css({
													display: 'flex',
													flexDirection: 'column',
													alignItems: 'center',
													gap: 'xs'
												})}
											>
												<Checkbox
													id={`checkbox-${branch.name}`}
													onclick={() => {
														if (selectedList.includes(branch.name)) {
															selectedManager.remove([branch.name]);
														} else {
															selectedManager.add([branch.name]);
														}
													}}
													checked={selectedList.includes(branch.name)}
													disabled={locked.has(branch.name)}
												>
													<div class={visuallyHidden()}>
														{branch.name}
													</div>
												</Checkbox>
												<Button
													size="xs"
													shape="square"
													emphasis="secondary"
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
												<LockBranchToggle repositoryID={id} branch={branch.name} />
											</div>
										{/if}

										{#if getBranchesQuery.data?.current_branch === branch.name}
											<div
												class={css({
													display: 'flex',
													alignItems: 'center',
													width: '100%',
													marginLeft: '2px',
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
											selected={selectedList.includes(branch.name)}
											locked={locked.has(branch.name) &&
												getBranchesQuery.data?.current_branch !== branch.name}
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
							{#if getBranchesQuery.data?.branches && !searchNoResultsFound}
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
