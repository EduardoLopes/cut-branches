<script lang="ts">
	import { invoke } from '@tauri-apps/api/tauri';
	import { repos } from '$lib/stores';

	export let path: string;
	let root_path: string;
	let branches: string[];
	let currentBranch: string;

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

	invoke('git_repo_dir', { path: path }).then((res: string) => {
		const resParser = JSON.parse(res);
		root_path = resParser.root_path;
		parseBranches(resParser.branches);

		if (!root_path) {
			repos.update((prev) => {
				return [...new Set(prev.filter((item) => item !== path))];
			});
		}
	});
</script>

{#if root_path}
	<div class="container">
		<div class="rootPath">{root_path}</div>

		{#if branches}
			<ul class="branches">
				{#each branches as branch}
					<li>{branch}</li>
				{/each}
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
		border-bottom: 1px solid #80a142;
		background: rgba(128, 161, 66, 0.2);
	}

	.branches {
		padding: 0;
		margin: 0;
	}

	.branches li {
		list-style: none;
		padding: 16px;
		border-bottom: 1px solid #80a142;
		cursor: pointer;
	}

	.branches li:hover {
		list-style: none;
		padding: 16px;
		border-bottom: 1px solid #80a142;
		background: rgba(128, 161, 66, 0.15);
		cursor: pointer;
	}

	.branches li:last-child {
		border-bottom: none;
	}
</style>
