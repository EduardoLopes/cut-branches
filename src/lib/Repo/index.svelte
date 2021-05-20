<script lang="ts">
	import { invoke } from '@tauri-apps/api/tauri';

	export let path;

	// invoke('git_status').then((message) => console.log(message));
	invoke('is_git_repo', { path: path }).then((message) => console.log(message));
</script>

<div>
	{path}
</div>

<style>
</style>
