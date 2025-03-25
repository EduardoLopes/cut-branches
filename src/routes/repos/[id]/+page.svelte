<script lang="ts">
	import { page } from '$app/state';
	import Repository from '$lib/components/repository.svelte';
	import { css } from '@pindoba/panda/css';
</script>

<div
	class={css({
		width: 'full',
		height: 'full'
	})}
>
	<Repository id={page.params.id} />
</div>
