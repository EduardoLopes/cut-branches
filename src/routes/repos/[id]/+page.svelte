<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Branches from '$lib/Branches/index.svelte';
	import { goto } from '$app/navigation';
	import { repos } from '$lib/stores';
	import { page } from '$app/stores';
</script>

<div class="content">
	<Branches id={$page.params.id} />
</div>

<style>
	.content {
		width: 100%;
		height: 100%;
	}
</style>
