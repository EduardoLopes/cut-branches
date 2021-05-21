<script lang="ts">
	import { invoke } from '@tauri-apps/api/tauri';

	interface PathInfo {
		absolute_path: string;
		root_path: string;
		branches: string;
	}

	export let path: string;
	let absolute_path: string;
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
		absolute_path = resParser.absolute_path;
		root_path = resParser.root_path;
		parseBranches(resParser.branches);
		console.log(currentBranch, branches);
	});
</script>

<div>
	Root path: {root_path}
	{currentBranch}
</div>

<style>
</style>
