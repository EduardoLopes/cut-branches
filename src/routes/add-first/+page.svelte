<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import AddRepo from '$lib/AddRepo/index.svelte';
	import { goto } from '$app/navigation';
	import { repos } from '$lib/stores';

	onMount(() => {
		let unsubscribeRepos = repos.subscribe((value) => {
			if (value.length >= 1) {
				goto('/');
			}
		});
		onDestroy(unsubscribeRepos);
	});
</script>

<div class="content">
	<h1>Select a repo using the button below</h1>
	<AddRepo isFirst={true} />
</div>

<style lang="scss">
	.content {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		height: 100vh;

		h1 {
			font-size: 2rem;
		}
	}
</style>
