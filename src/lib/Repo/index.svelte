<script lang="ts">
	import { invoke } from '@tauri-apps/api/tauri';

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
	});
</script>

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

<style>
	.container {
		min-width: 500px;
		background: rgba(128, 161, 66, 0.4);
		border: 1px solid #80a142;
	}
	.rootPath {
		padding: 16px;
		border-bottom: 1px solid #80a142;
	}
</style>
