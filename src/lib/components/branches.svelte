<script lang="ts">
	import type { IBranch } from '$lib/stores/branches';

	import { repos } from '$lib/stores/branches';
	import Button from '@pindoba/svelte-button';
	import Branch from '$lib/components/branch.svelte';
	import Icon from '@iconify/svelte';
	import Checkbox from '@pindoba/svelte-checkbox';
	import { navigating, page } from '$app/stores';
	import { fly } from 'svelte/transition';
	import { getRepoByPath } from '$lib/services/getRepoByPath';
	import { intlFormat, intlFormatDistance } from 'date-fns';
	import debounce from 'just-debounce-it';
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

	const notifications = createNotifications();

	interface Props {
		id: string | null;
	}
	const { id }: Props = $props();

	let selectedManager = $derived(createSelected(id));

	const selectedList = $derived(id ? ($selected[id] ?? []) : []);

	const oneMinute = 60000;

	const currentRepo = $derived($repos.filter((item) => item.id === id)[0]);
	const getBranchesQuery = getRepoByPath(() => currentRepo?.path ?? history.state.path, {
		staleTime: oneMinute,
		meta: {
			showErrorNotification: false
		}
	});

	$effect(() => {
		if ($navigating) {
			clearSearch();
		}
	});

	// current branch first
	function sort(a: IBranch, b: IBranch) {
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
						message: `The repository <strong>${getBranchesQuery.data?.name}</strong> was updated`,
						feedback: 'success'
					});
				}
			});
		}
	}

	function clearSearch() {
		searchQuery = '';
		deboucedSearchQuery = '';
		currentPage = 1;
	}

	let searchQuery = $state('');
	let deboucedSearchQuery = $state('');

	const debounceSearchQuery = debounce((value: string) => {
		deboucedSearchQuery = value;
	}, 300);

	$effect(() => {
		debounceSearchQuery(searchQuery);
	});

	let currentPage = $state(1);
	let itemsPerPage = $state(10);

	let branches = $derived(
		getBranchesQuery.data
			? [...getBranchesQuery.data.branches]
					.sort(sort)
					.filter((item) =>
						item.name.toLowerCase().trim().includes(deboucedSearchQuery.toLowerCase().trim())
					)
			: []
	);

	let start = $derived(Math.max(0, itemsPerPage * (currentPage - 1)));
	let end = $derived(start + itemsPerPage);
	let paginatedBranches = $derived(branches?.slice(start, end));

	$effect(() => {
		if ($navigating) {
			currentPage = 1;
			searchQuery = '';
		}
	});

	let selectibleCount = $derived(
		Math.max(
			0,
			branches?.filter((item) => item.name !== getBranchesQuery.data?.current_branch)?.length ?? 0
		)
	);

	let searchNoResultsFound = $derived(deboucedSearchQuery.length > 0 && branches?.length === 0);

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
		selectibleCount === 0 &&
			getBranchesQuery.data?.branches.length !== 0 &&
			deboucedSearchQuery.length === 0
	);

	const selectedLength = $derived(
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
				in:fly|local={{ x: -20 }}
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
			root: {
				borderRadius: '0'
			},
			overlay: {
				borderRadius: '0',
				border: 'none'
			}
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
				<div class="error" in:fly={{ y: -10 }} out:fly|local={{ y: -10 }}>
					<div>
						<Icon
							icon="material-symbols:dangerous-rounded"
							width="64px"
							height="64px"
							color="var(--color-danger-10)"
						/>
						<div class="message">{@html getBranchesQuery.error.message}</div>
						<div class="description">{@html getBranchesQuery.error.description}</div>
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
						backdropFilter: 'blur(5px) saturate(3)',
						_light: {
							background: 'neutral.200/80'
						},
						_dark: {
							background: 'neutral.50/80'
						}
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
									in:fly={{ x: -10 }}
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
										indeterminate={selectedLength !== selectibleCount && selectedLength > 0}
										onclick={() => {
											const indeterminate =
												selectedLength !== selectibleCount && selectedLength > 0;

											if (indeterminate || selectedLength === 0) {
												selectedManager.add(
													branches
														?.map((item) => item.name)
														.filter((item) => item !== getBranchesQuery.data?.current_branch) ?? []
												);
											} else {
												selectedManager.clear();
											}
										}}
										checked={selectedLength === selectibleCount}
									>
										<div class={visuallyHidden()}>Select all</div>
									</Checkbox>
									{#if deboucedSearchQuery.length > 0}
										{selectedLength} / {selectibleCount}
										{selectibleCount === 1 ? 'branch was' : 'branches were'} found
									{/if}

									{#if deboucedSearchQuery.length === 0}
										{selectedLength} / {selectibleCount} branches
									{/if}
								</div>
							{/key}
						{/if}
					</div>

					<div class="actions">
						{#if selectibleCount > 0 && deboucedSearchQuery.length === 0}
							<div in:fly|local={{ x: 15 }} out:fly|local={{ x: 15 }}>
								<DeleteBranchModal {currentRepo} />
							</div>
						{/if}

						{#if deboucedSearchQuery.length > 0 || searchNoResultsFound}
							<div in:fly={{ x: 10 }}>
								<Button emphasis="ghost" size="sm" onclick={clearSearch}>
									<div
										class={css({
											display: 'flex',
											alignItems: 'center',
											gap: 'xs'
										})}
									>
										<Icon icon="mdi:clear" width="16px" height="16px" />
										Clear search
									</div>
								</Button>
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
					in:fly|local={{ x: -30, duration: 150 }}
				>
					{#if hasNoBranchesToDelete}
						<div
							class={css({
								display: 'flex',
								alignItems: 'center',
								padding: 'md',
								fontSize: 'lg'
							})}
							in:fly={{ x: -10 }}
						>
							This repository has no branches to delete.
						</div>
					{/if}

					{#if searchNoResultsFound}
						<div class="search-no-found" in:fly={{ y: -10 }} out:fly|local={{ y: -10 }}>
							<div>
								<Icon
									icon="material-symbols:search-off"
									width="64px"
									height="64px"
									color="var(--color-warning-10)"
								/>
								<div>No results for <b>{deboucedSearchQuery}</b>!</div>
							</div>
						</div>
					{/if}

					{#if getBranchesQuery.data.branches.length === 0}
						<div class="no-branches" in:fly={{ y: -10 }} out:fly|local={{ y: -10 }}>
							<div>
								<Icon
									icon="mdi:source-branch-remove"
									width="64px"
									height="64px"
									color="var(--color-warning-10)"
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
											<div class="checkbox">
												<Checkbox
													id={`checkbox-${branch.name}`}
													onclick={() => {
														if (selectedList.includes(branch.name)) {
															selectedManager.remove(branch.name);
														} else {
															selectedManager.add([branch.name]);
														}
													}}
													checked={selectedList.includes(branch.name)}
												>
													<div class={visuallyHidden()}>
														{branch.name}
													</div>
												</Checkbox>
											</div>
										{/if}

										{#if getBranchesQuery.data?.current_branch === branch.name}
											<div
												class={css({
													display: 'flex',
													alignItems: 'center',
													width: '100%',
													marginLeft: '2px'
												})}
											>
												<Icon
													icon="octicon:feed-star-16"
													width="32px"
													height="32px"
													color={token('colors.primary.800')}
												/>
											</div>
										{/if}

										<Branch data={branch} selected={selectedList.includes(branch.name)} />
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
										backdropFilter: 'blur(5px) saturate(3)',
										_light: {
											background: 'neutral.200/80'
										},
										_dark: {
											background: 'neutral.50/80'
										}
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
						in:fly|local={{ x: 15 }}
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

<style lang="scss">
	.search-no-found,
	.no-branches,
	.error {
		display: grid;
		place-items: center;
		height: 100%;
		font-size: 2rem;
		flex-direction: column;
		gap: 1.6rem;
		> div {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 1.6rem;
			max-width: 500px;
			text-align: center;
		}
	}

	.error {
		.description {
			font-size: 1.8rem;
			text-align: center;
			color: var(--color-neutral-11);
		}
	}
</style>
