<script lang="ts">
	import type { IBranch } from '$lib/stores';

	import Branch from '$lib/Branch/index.svelte';

	import { getRepoInfo, toast } from '$lib/utils';
	import { repos } from '$lib/stores';
	import Button from '$lib/primitives/Button/index.svelte';
	import Icon from '@iconify/svelte';

	let selected: IBranch[] = [];
	export let id: string | null = null;

	$: currentRepo = $repos.filter((item) => item.name === id)[0];

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
			getRepoInfo(currentRepo.path)
				.then((res) => {
					if (res) {
						$repos = [...$repos.filter((item) => item.path !== res.path), res];
						currentRepo = res;
					}
				})
				.catch((errors: string[]) => {
					errors.reverse().forEach((item) => toast.failure(item));
				});
		}
	}
</script>

{#if currentRepo}
	<main class="container">
		<div class="header">
			<h1>{currentRepo.name}</h1>
			<div class="menu">
				<Button variant="tertiary" size="sm" on:click={update_repo}>
					<Icon
						icon="material-symbols:refresh-rounded"
						width="24px"
						height="24px"
						color="var(--primary-color)"
					/>
				</Button>
				<a href={`/repos/${currentRepo.name}/remove`}>
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

		<div class="branches">
			{#if currentRepo.branches}
				{#each currentRepo.branches.sort(sort) as branch (branch.name)}
					<Branch
						{branch}
						showDeletebutton={selected.length === 0}
						selected={selected.some((item) => item === branch)}
						disabled={branch.current}
						onClick={() => {
							if (selected.some((item) => item.name === branch.name)) {
								selected = selected.filter((item) => item.name !== branch.name);
								return;
							}

							selected.push(branch);
							selected = selected;
						}}
						onClickDelete={() => {
							selected = [branch];
						}}
					/>
				{/each}
			{/if}
			{#if selected.length > 0}
				<button class="delete-all">
					Delete {#if selected.length > 1}all ({selected.length}){/if}</button
				>
			{/if}
		</div>
	</main>
{/if}

<style lang="scss">
	.container {
		background: #e9e9e7;
		overflow: hidden;
		position: relative;
		height: 100%;
	}

	.branches {
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		grid-auto-rows: max-content;
		gap: 8px;
		border: 1px dashed var(--color-gray);
		padding: 16px;
	}

	.delete-all {
		position: sticky;
		bottom: 0;
		background: #f34642;
		padding: 16px;
		color: #fff;
		border: 0;
		cursor: pointer;
	}

	.header {
		display: flex;
		justify-content: space-between;
		background: #fff;
		top: 0;
		box-shadow: 0px 2px 2px 0px rgb(0 0 0 / 8%);

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
</style>
