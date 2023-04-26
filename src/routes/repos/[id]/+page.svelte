<script lang="ts">
	import Branches from '$lib/Branches/index.svelte';
	import { page } from '$app/stores';
</script>

<div class="content">
	{#key $page.params.id}
		<Branches id={$page.params.id} />
	{/key}
</div>

<style>
	.content {
		width: 100%;
		height: 100%;
	}
</style>
