<script lang="ts">
	import { repos } from '$lib/stores';
	import { onMount } from 'svelte';

	export let path: string;

	let apiInvoke;
	let root_path: string;
	let branches: string[];
	let currentBranch: string;
	let branchSelected: string[] = [];

	function parseBranches(rowBranches: string) {
		branches = rowBranches
			.split('\n')
			.map((item) => {
				if (/\*\s.*/gm.test(item)) {
					currentBranch = item.trim().replace('* ', '');
					return item.trim().replace('* ', '');
				}

				return item.trim();
			})
			.filter((item) => item !== '');
	}

	onMount(async () => {
		const { invoke } = await import('@tauri-apps/api/tauri');

		apiInvoke = invoke;

		apiInvoke('git_repo_dir', { path }).then((res: string) => {
			const resParser = JSON.parse(res);
			root_path = resParser.root_path;
			parseBranches(resParser.branches);

			if (!root_path) {
				repos.update((prev) => {
					return [...new Set(prev.filter((item) => item !== path))];
				});
			}
		});
	});

	function handleBranchClick(branchClicked) {
		if (branches.length <= 1) return;

		const alreadySelected = branchSelected.some((item) => item === branchClicked);
		if (alreadySelected) {
			branchSelected = branchSelected.filter((item) => item !== branchClicked);
		} else {
			branchSelected.push(branchClicked);
		}

		branchSelected = branchSelected;
	}
</script>

{#if root_path}
	<div class="container">
		<div class="rootPath">{root_path}</div>

		{#if branches}
			<ul class="branches">
				{#each branches as branch}
					<li
						class={branchSelected.some((item) => item === branch) ? 'selected' : ''}
						style={branches.length > 1 ? 'cursor: pointer' : 'cursor: default'}
					>
						<div>
							<div class="branch-name" on:click={() => handleBranchClick(`${branch}`)}>
								{branch}
							</div>
							<div class="button-container">
								{#if branches.length > 1}
									<button class={branchSelected.length > 0 ? 'hide' : ''}>X</button>
								{/if}
							</div>
						</div>
					</li>
				{/each}
				{#if branchSelected.length}
					<li class="delete-all-container">
						<button>Delete All ({branchSelected.length})</button>
					</li>
				{/if}
			</ul>
		{/if}
	</div>
{/if}

<style>
	.container {
		min-width: 500px;
		background: rgba(128, 161, 66, 0.1);
		border: 1px solid #80a142;
	}
	.rootPath {
		padding: 16px;
		border-bottom: 1px solid #c0d892;
		background: #c0d892;
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.branches {
		padding: 0;
		margin: 0;
		position: relative;
	}

	.branches li {
		list-style: none;
		border-bottom: 1px solid #80a142;
	}

	.branches li.selected {
		background: rgba(255, 142, 142, 0.5);
	}

	.branches li.selected:hover {
		background: rgba(255, 142, 142, 0.7);
	}
	.branches li div {
		display: grid;
		grid-template-columns: auto min-content;
	}

	.button-container {
		padding: 4px;
		padding-left: 0;
	}

	.branches li .button-container button {
		border: none;
		background: rgb(255, 142, 142);
		padding: 8px 16px;
		height: 100%;
		cursor: pointer;
		color: #fff;
	}

	.branches li div button.hide {
		display: none;
	}

	.branches li div button:hover {
		background: rgb(255, 168, 142);
	}

	.branches li .branch-name {
		padding: 16px;
	}

	.branches li:hover {
		background: rgba(128, 161, 66, 0.15);
	}

	.branches li:last-child {
		border-bottom: none;
	}
	.delete-all-container {
		position: sticky;
		bottom: 0;
	}
	.delete-all-container button {
		width: 100%;
		padding: 16px;
		background: rgb(255, 142, 142);
		border: none;
		cursor: pointer;
	}
</style>
