<script lang="ts">
	import { invoke } from '@tauri-apps/api/tauri';

	export let path;

	invoke('git_repo_dir', { path: path }).then((real_path) => (path = real_path));
</script>

<div>
	{path}
</div>

<style>
</style>
