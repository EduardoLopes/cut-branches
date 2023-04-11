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

	let selected: string[] = [];
	export let id: string | null = null;

	$: currentRepo = $repos.filter((item) => item.name === id)[0] as IRepo | undefined;
	$: getBranchesQuery = getRepoByPath(currentRepo?.path ?? history.state.path);
	$: if ($navigating) selected = [];
	$: selectibleCount = Math.max(0, ($getBranchesQuery.data?.branches?.length ?? 0) - 1);

	$: if ($navigating) console.log({ state: history.state });

	function nextPage() {
		pagination.page++;
	}

	function prevPage() {
		pagination.page--;
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
			$getBranchesQuery.refetch();
		}
	}

	function handleDelete() {
		goto(`/repos/${$getBranchesQuery.data?.name}/delete`, {
			state: {
				branches: selected
			}
		});
	}

	let searchQuery = '';

	$: pagination = {
		page: 0,
		perPage: 10,
		totalPages: Math.ceil(($getBranchesQuery.data?.branches?.length ?? 0) / 10)
	};

	$: start = Math.max(0, pagination.perPage * pagination.page);
	$: end = start + pagination.perPage;
	$: branches =
		$getBranchesQuery.data?.branches.sort(sort).filter((item) => item.name.includes(searchQuery)) ??
		[];

	$: paginatedBranches = branches.slice(start, end);

	$: totalPages = Math.ceil((branches?.length ?? 0) / 10);
</script>

<main class="container">
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
			<a href={`/repos/${$getBranchesQuery.data?.name}/remove`}>
				<Button variant="tertiary" size="sm">
					<Icon
						icon="solar:close-circle-linear"
						width="24px"
						height="24px"
						color="var(--primary-color)"
					/>
				</Button>
			</a>
		</div>
	</div>

	{#key $page.params.id}
		<div class="content" in:fly={{ y: -30, duration: 150 }}>
			<div class="toolbar-container">
				<div class="left">
					{#if selectibleCount > 0}
						{#key selectibleCount}
							<div in:fly={{ x: -10 }} class="checkbox">
								<Checkbox
									visuallyHideLabel
									indeterminate={selected.length !== selectibleCount && selected.length > 0}
									on:click={(e) => {
										const indeterminate =
											selected.length !== selectibleCount && selected.length > 0;

										if (indeterminate || selected.length === 0) {
											selected =
												$getBranchesQuery.data?.branches
													.map((item) => item.name)
													.filter((item) => item !== $getBranchesQuery.data?.current_branch) ?? [];
										} else {
											selected = [];
										}
									}}
									checked={selected.length === selectibleCount}
								>
									Select all
								</Checkbox>

								{selected.length} / {selectibleCount} branches selected
							</div>
						{/key}
					{/if}

					{#if selectibleCount === 0}
						<div in:fly={{ x: -10 }}>This repository has no branches to delete.</div>
					{/if}
				</div>

				<div class="actions">
					{#if selectibleCount > 0}
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
				</div>
			</div>
			<div class="branches">
				{#if paginatedBranches}
					{#each paginatedBranches as branch, index (branch.name)}
						<div
							class="branch-container"
							class:selected={selected.includes(branch.name)}
							animate:flip={{ duration: 150 }}
							in:fly={{
								x: -30,
								duration: 150,
								delay: 20 * (index + 1 / paginatedBranches.length)
							}}
						>
							{#if $getBranchesQuery.data?.current_branch !== branch.name}
								<div class="checkbox">
									<Checkbox
										visuallyHideLabel
										on:click={(e) => {
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
			<div class="bottom-toolbar">
				<div class="left">
					<input class="search-input" placeholder="Search" bind:value={searchQuery} />
				</div>
				<div class="pagination">
					{#if $getBranchesQuery.data?.branches}
						<Button
							variant="tertiary"
							size="sm"
							on:click={prevPage}
							state={pagination.page <= 0 ? 'disabled' : 'normal'}
						>
							<Icon icon="material-symbols:chevron-left-rounded" width="32px" height="32px" />
						</Button>
						<div class="numbers">
							{pagination.page + 1} / {totalPages}
						</div>
						<Button
							variant="tertiary"
							size="sm"
							on:click={nextPage}
							state={pagination.page + 1 >= totalPages ? 'disabled' : 'normal'}
						>
							<Icon icon="material-symbols:chevron-right-rounded" width="32px" height="32px" />
						</Button>
					{/if}
				</div>
			</div>
		</div>
	{/key}
</main>

<style lang="scss">
	.transition {
		transition-timing-function: ease-in-out;
		transition-duration: 0.1s;
		transition-property: width, height, border, color, background, padding, font-size, max-height;
	}
	.container {
		background: var(--color-neutral-2);
		overflow: hidden;
		position: relative;
		height: 100%;
	}

	.header {
		display: flex;
		justify-content: space-between;
		background: var(--color-neutral-2);
		top: 0;
		border-bottom: 1px dashed var(--color-neutral-8);
		z-index: 20;

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
				button,
				a {
					border-radius: 0;
					height: 100%;
					align-items: center;
					justify-content: center;
					width: 57px;
				}
			}
		}
	}

	.bottom-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		position: sticky;
		bottom: 0;
		background: var(--color-neutral-2);
		z-index: 10;
		border-top: 1px solid var(--color-neutral-6);

		.left {
			display: flex;
			.search-input {
				display: block;
				height: 100%;
				padding: 1.6rem;
				margin: 0;
				border-radius: 0;
				appearance: none;
				border: 1px solid var(--color-neutral-6);
				border-top-width: 0;
			}
		}

		.pagination {
			display: flex;

			.numbers {
				display: flex;
				align-items: center;
				padding: 1.6rem;
			}
			:global(.button) {
				border-radius: 0;
				border: 1px solid var(--color-neutral-6);
				border-top-width: 0;
			}
		}
	}

	.toolbar-container {
		display: flex;
		justify-content: space-between;
		align-items: center;
		position: sticky;
		top: 0;
		background: var(--color-neutral-2);
		padding: 1.6rem;
		z-index: 10;
		min-height: 66px;

		.left,
		.checkbox {
			display: flex;
			flex-direction: row;
			align-items: center;
			height: 100%;
			gap: 1.6rem;
		}
	}

	.content {
		overflow-y: scroll;
		height: calc(100vh - 57px);
		overflow-x: hidden;
	}

	.branch-container {
		position: relative;
		display: grid;
		grid-template-columns: 24px auto;
		gap: 1.6rem;
		border-radius: 4px;
		@extend .transition;
	}

	.current-branch-icon {
		display: flex;
		align-items: center;
		width: 100%;
		margin-left: 2px;
	}
	.branches {
		display: flex;
		flex-direction: column;
		grid-auto-rows: max-content;
		gap: 1.6rem;
		border: 1px dashed var(--color-gray);
		padding: 16px;
		padding-top: 0;
	}
</style>
