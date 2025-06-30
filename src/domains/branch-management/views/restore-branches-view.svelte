<script lang="ts">
	import Repository from '$domains/repository-management/views/repository-view.svelte';
	import { css } from '@pindoba/panda/css';

	interface Props {
		id?: string;
	}

	let { id }: Props = $props();
</script>

<div
	class={css({
		width: 'full',
		height: 'full'
	})}
>
	<Repository
		{id}
		branchesType="deleted"
		allowLocking={false}
		allowSelection={true}
		allowSetCurrent={false}
	/>
</div>
