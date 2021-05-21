<script lang="ts">
	import { invoke } from '@tauri-apps/api/tauri';

	interface PathInfo {
		absolute_path: string;
		root_path: string;
	}

	export let path: string;
	let absolute_path: string;
	let root_path: string;

	invoke('git_repo_dir', { path: path }).then((real_path: string) => {
		absolute_path = JSON.parse(real_path).absolute_path;
		root_path = JSON.parse(real_path).root_path;
	});
</script>

<div>
	Root path: {root_path}
</div>

<style>
</style>
