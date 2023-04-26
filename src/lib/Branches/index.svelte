<script lang="ts">
	import type { IBranch, IRepo } from '$lib/stores';

	import { repos } from '$lib/stores';
	import Button from '$lib/primitives/Button/index.svelte';
	import Branch from '$lib/Branch/index.svelte';
	import Icon from '@iconify/svelte';
	import Checkbox from '$lib/primitives/Checkbox.svelte';
	import { navigating, page } from '$app/stores';
	import { fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { goto } from '$app/navigation';
	import { getRepoByPath } from '$lib/services/getRepoByPath';
	import { format, intlFormat, intlFormatDistance } from 'date-fns';
	import debounce from 'just-debounce-it';
	import { onMount } from 'svelte';
	import { toast } from '$lib/primitives/Toast.svelte';
	import { version } from '$app/environment';
	import Loading from '$lib/primitives/Loading.svelte';

	let selected: string[] = [];
	export let id: string | null = null;
	let searchInputElement: HTMLInputElement | null = null;

	$: currentRepo = $repos.filter((item) => item.name === id)[0] as IRepo | undefined;
	$: getBranchesQuery = getRepoByPath(currentRepo?.path ?? history.state.path, {
		staleTime: 0,
		meta: {
			showErrorToast: false
		}
	});
	$: if ($navigating) {
		selected = [];
		clearSearch();
	}

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
			$getBranchesQuery.refetch().then(() => {
				toast.success({
					message: `The repository <strong>${$getBranchesQuery.data?.name}</strong> was updated`
				});
			});
		}
	}

	function handleDelete() {
		goto(`/repos/${$getBranchesQuery.data?.name}/delete`, {
			state: {
				branches: selected
			}
		});
	}

	function clearSearch() {
		searchQuery = '';
		deboucedSearchQuery = '';
		currentPage = 0;
	}

	let searchQuery = '';
	let deboucedSearchQuery = '';

	const debounceSearchQuery = debounce((value: string) => {
		deboucedSearchQuery = value;
	}, 300);

	$: debounceSearchQuery(searchQuery);

	let currentPage = 0;
	let itemsPerPage = 10;

	function nextPage() {
		currentPage++;
	}

	function prevPage() {
		currentPage--;
	}

	$: start = Math.max(0, itemsPerPage * currentPage);
	$: end = start + itemsPerPage;
	$: branches =
		$getBranchesQuery.data?.branches
			.sort(sort)
			.filter((item) => item.name.includes(deboucedSearchQuery)) ?? [];

	$: paginatedBranches = branches.slice(start, end);

	$: totalPages = Math.ceil((branches?.length ?? 0) / 10);

	$: if ($navigating) {
		currentPage = 0;
		searchQuery = '';
	}

	$: selectibleCount = Math.max(
		0,
		branches.filter((item) => item.name !== $getBranchesQuery.data?.current_branch)?.length ?? 0
	);

	$: searchNoResultsFound = deboucedSearchQuery.length > 0 && branches.length === 0;

	$: lastUpdatedAtDate = $getBranchesQuery.dataUpdatedAt
		? new Date($getBranchesQuery.dataUpdatedAt)
		: undefined;

	$: lastUpdatedAt = lastUpdatedAtDate ? intlFormatDistance(lastUpdatedAtDate, Date.now()) : null;

	onMount(() => {
		const interval = setInterval(() => {
			if (lastUpdatedAtDate) {
				lastUpdatedAt = intlFormatDistance(lastUpdatedAtDate, Date.now());
			}
		}, 61000);

		return () => {
			clearInterval(interval);
		};
	});
</script>

<Loading state={$getBranchesQuery.isInitialLoading ? 'loading' : undefined}>
	<main class="container">
		{#if $getBranchesQuery.isError}
			<div class="error" in:fly={{ y: -10 }} out:fly|local={{ y: -10 }}>
				<div>
					<Icon
						icon="material-symbols:dangerous-rounded"
						width="64px"
						height="64px"
						color="var(--color-danger-10)"
					/>
					<div class="message">{@html $getBranchesQuery.error.message}</div>
					<div class="description">{@html $getBranchesQuery.error.description}</div>
				</div>
			</div>
		{/if}

		{#if $getBranchesQuery.isSuccess}
			<div class="header">
				{#key $getBranchesQuery.data?.name}
					<h1 in:fly={{ x: -20 }}>{$getBranchesQuery.data?.name}</h1>
				{/key}
				<div class="menu">
					<Button
						variant="tertiary"
						size="sm"
						on:click={update_repo}
						state={$getBranchesQuery.isFetching ? 'loading' : undefined}
					>
						<Icon
							icon="material-symbols:refresh-rounded"
							width="24px"
							height="24px"
							color="var(--primary-color)"
						/>
					</Button>

					<Button
						variant="tertiary"
						size="sm"
						on:click={() => {
							goto(`/repos/${$getBranchesQuery.data?.name}/remove`);
						}}
					>
						<Icon
							icon="solar:close-circle-linear"
							width="24px"
							height="24px"
							color="var(--primary-color)"
						/>
					</Button>
				</div>
			</div>

			{#key $page.params.id}
				<div class="content" in:fly={{ y: -30, duration: 150 }}>
					<div class="toolbar-container">
						<div class="left">
							{#if selectibleCount > 0}
								{@const selectedLength = branches.filter((item) =>
									selected.includes(item.name)
								).length}
								{#key selectibleCount}
									<div in:fly={{ x: -10 }} class="checkbox">
										<Checkbox
											visuallyHideLabel
											indeterminate={selectedLength !== selectibleCount && selectedLength > 0}
											on:click={() => {
												const indeterminate =
													selectedLength !== selectibleCount && selectedLength > 0;

												if (indeterminate || selectedLength === 0) {
													selected =
														branches
															.map((item) => item.name)
															.filter((item) => item !== $getBranchesQuery.data?.current_branch) ??
														[];
												} else {
													const allSelectedBranch = branches.map((item) => item.name);

													selected = selected.filter((item) => !allSelectedBranch.includes(item));
												}
											}}
											checked={selectedLength === selectibleCount}
										>
											Select all
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

							{#if selectibleCount === 0 && $getBranchesQuery.data.branches.length !== 0 && deboucedSearchQuery.length === 0}
								<div in:fly={{ x: -10 }}>This repository has no branches to delete.</div>
							{/if}
						</div>

						<div class="actions">
							{#if selectibleCount > 0 && deboucedSearchQuery.length === 0}
								<div in:fly={{ x: 10 }}>
									<Button
										variant="primary"
										feedback="danger"
										size="sm"
										state={selected.length === 0 ? 'disabled' : undefined}
										on:click={handleDelete}
									>
										<Icon
											icon="ion:trash-outline"
											width="16px"
											height="16px"
											color="var(--primary-color)"
										/>
										Delete
									</Button>
								</div>
							{/if}

							{#if deboucedSearchQuery.length > 0 || searchNoResultsFound}
								<div in:fly={{ x: 10 }}>
									<Button variant="primary" feedback="info" size="sm" on:click={clearSearch}>
										<Icon icon="mdi:clear" width="16px" height="16px" />
										Clear search
									</Button>
								</div>
							{/if}
						</div>
					</div>
					<div class="branches-container">
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

						{#if $getBranchesQuery.data.branches.length === 0}
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

						{#key currentPage}
							<div
								class="branches"
								in:fly={{ x: 40, duration: 200 }}
								out:fly|local={{ x: 60, duration: 200 }}
							>
								{#if paginatedBranches}
									{#each paginatedBranches as branch, index (branch.name)}
										<div
											class="branch-container"
											class:selected={selected.includes(branch.name)}
											animate:flip={{ duration: 150 }}
										>
											<!-- Nice animation that has bad performance -->
											<!--
										in:fly={{
											x: -30,
											duration: 150,
											delay: 20 * (index + 1 / paginatedBranches.length)
										}}
										out:fly|local={{
											x: -30,
											duration: 150,
											delay: 20 * (index + 1 / paginatedBranches.length)
										}}
									-->
											{#if $getBranchesQuery.data?.current_branch !== branch.name}
												<div class="checkbox">
													<Checkbox
														visuallyHideLabel
														on:click={() => {
															if (selected.includes(branch.name)) {
																selected = selected.filter((item) => item !== branch.name);
															} else {
																selected = [...selected, branch.name];
															}
														}}
														checked={selected.includes(branch.name)}
													>
														{branch.name}
													</Checkbox>
												</div>
											{/if}

											{#if $getBranchesQuery.data?.current_branch === branch.name}
												<div class="current-branch-icon">
													<Icon
														icon="octicon:feed-star-16"
														width="32px"
														height="32px"
														color="var(--color-warning-10)"
													/>
												</div>
											{/if}

											<Branch data={branch} selected={selected.includes(branch.name)} />
										</div>
									{/each}
								{/if}
							</div>
						{/key}
					</div>
					<div class="bottom-toolbar">
						<div class="left">
							<div class="search-input-container">
								<input
									class="search-input"
									placeholder="Search"
									bind:value={searchQuery}
									on:input={() => {
										currentPage = 0;
									}}
									bind:this={searchInputElement}
								/>

								<Button
									variant="tertiary"
									size="sm"
									on:click={() => {
										if (deboucedSearchQuery.length > 0) {
											clearSearch();
										} else {
											searchInputElement?.focus();
										}
									}}
								>
									{#if deboucedSearchQuery.length > 0}
										<Icon icon="mdi:clear" width="24px" height="24px" />
									{:else}
										<Icon icon="ic:round-search" width="24px" height="24px" />
									{/if}
								</Button>
							</div>
							<!-- <div class="search-info">
						{#if deboucedSearchQuery}
							{#if branches.length === 0}
								No results found
							{/if}
							{#if branches.length > 1}
								{branches.length} branches were found!
							{/if}
							{#if branches.length === 1}
								A single branch was found!
							{/if}
						{/if}
					</div> -->
						</div>
						{#if $getBranchesQuery.data?.branches && !searchNoResultsFound}
							<div class="pagination" in:fly={{ x: 10 }} out:fly|local={{ x: 10 }}>
								<Button
									variant="tertiary"
									size="sm"
									on:click={prevPage}
									state={currentPage <= 0 ? 'disabled' : 'normal'}
								>
									<Icon icon="material-symbols:chevron-left-rounded" width="24px" height="24px" />
								</Button>
								<div class="numbers">
									{currentPage + 1} / {totalPages}
								</div>
								<Button
									variant="tertiary"
									size="sm"
									on:click={nextPage}
									state={currentPage + 1 >= totalPages ? 'disabled' : 'normal'}
								>
									<Icon icon="material-symbols:chevron-right-rounded" width="24px" height="24px" />
								</Button>
							</div>
						{/if}
					</div>
					<div class="bottom-info-bar">
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
								Last updated {lastUpdatedAt}
							</time>
						{/if}
					</div>
				</div>
			{/key}
		{/if}
	</main>
</Loading>

<style lang="scss">
	.container {
		display: flex;
		flex-direction: column;
		background: var(--color-neutral-2);
		overflow: hidden;
		position: relative;
		height: 100%;
		position: relative;
	}

	.header {
		display: flex;
		justify-content: space-between;
		background: var(--color-neutral-2);
		top: 0;
		border-bottom: 1px dashed var(--color-neutral-8);
		z-index: 20;
		flex-shrink: 0;

		h1 {
			font-size: 1.3em;
			margin: 0;
			text-align: left;
			text-transform: uppercase;
			font-weight: bold;
			padding: 1.6rem;
		}

		.menu {
			display: flex;
			// margin-right: 1.6rem;
			align-items: center;

			:global {
				button {
					border-radius: 0;
					height: 100%;
					align-items: center;
					justify-content: center;
					width: 57px;
					height: 100%;
				}
			}
		}
	}

	.content {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
	}

	.toolbar-container {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--color-neutral-2);
		padding: 1.6rem;
		z-index: 10;
		min-height: 66px;
		flex-shrink: 0;

		.left,
		.checkbox {
			display: flex;
			flex-direction: row;
			align-items: center;
			height: 100%;
			gap: 1.6rem;
		}
	}

	.branches-container {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		overflow: hidden;
		position: relative;
	}

	.search-no-found,
	.no-branches,
	.error {
		display: grid;
		place-items: center;
		height: 100%;
		font-size: 2.4rem;
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
			font-size: 2.2rem;
			text-align: center;
			color: var(--color-neutral-11);
		}
	}

	.branches {
		display: flex;
		flex-direction: column;
		grid-auto-rows: max-content;
		gap: 1.6rem;
		border: 1px dashed var(--color-gray);
		padding: 16px;
		padding-top: 0;
		flex-grow: 1;
		overflow-y: scroll;
		height: calc(100vh - 200px);
		z-index: 0;
		position: absolute;
		width: 100%;
		height: 100%;

		.branch-container {
			position: relative;
			display: grid;
			grid-template-columns: 24px auto;
			gap: 1.6rem;
			border-radius: 4px;
		}

		.current-branch-icon {
			display: flex;
			align-items: center;
			width: 100%;
			margin-left: 2px;
		}
	}

	.bottom-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--color-neutral-2);
		z-index: 10;
		border-top: 1px solid var(--color-neutral-6);
		flex-shrink: 0;

		.left {
			display: flex;

			.search-input-container {
				display: flex;
				align-items: center;
				flex-direction: row;
				border: 1px solid var(--color-neutral-6);
				border-bottom: none;

				:global(button) {
					border-radius: 0;
					height: 100%;
					align-items: center;
					justify-content: center;
				}
				.search-input {
					display: block;
					height: 100%;
					padding: 1.2rem;
					margin: 0;
					border: none;
					border-radius: 0;
					appearance: none;
					border-top-width: 0;
					z-index: 2;
				}
			}
		}

		.pagination {
			display: flex;
			height: 100%;

			.numbers {
				display: flex;
				align-items: center;
				padding: 1.2rem;
				white-space: nowrap;
				font-size: 1.4rem;
				background: var(--color-neutral-1);
				min-width: 75px;
				text-align: center;
				justify-content: center;
			}

			:global(.button) {
				display: grid;
				align-items: center;
				border-radius: 0;
				border: 1px solid var(--color-neutral-6);
				border-top-width: 0;
				height: 100%;
				border-bottom: none;
				border-top: none;

				&:last-child {
					border-right: none;
				}
			}
		}
	}

	.bottom-info-bar {
		font-size: 1.2rem;
		padding: 0.4rem 0.8rem;
		border-top: solid 1px var(--color-neutral-6);
		background: var(--color-neutral-4);
		text-align: right;
		color: var(--color-neutral-11);
	}
</style>
