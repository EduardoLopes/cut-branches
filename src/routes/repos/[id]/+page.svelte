<script lang="ts">
	import Branches from '$lib/components/branches.svelte';
	import { page } from '$app/stores';
	import { css } from '@pindoba/panda/css';
</script>

<div
	class={css({
		width: 'full',
		height: 'full'
	})}
>
	<Branches id={$page.params.id} />
</div>
