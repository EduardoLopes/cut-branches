<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { repos } from '$lib/stores/branches';
	import { navigating, page } from '$app/stores';
</script>
