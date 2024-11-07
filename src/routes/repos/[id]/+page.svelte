<script lang="ts">
	import { page } from '$app/stores';
	import Branches from '$lib/components/branches.svelte';
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
