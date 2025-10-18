<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { visuallyHidden } from '@pindoba/panda/patterns';

	interface Props {
		repositoryId: string;
	}

	const { repositoryId }: Props = $props();

	function navigateBack() {
		goto(resolve(`/repos/${repositoryId}`));
	}
</script>

<Button emphasis="ghost" size="sm" onclick={navigateBack} shape="square" data-testid="back-button">
	<Icon icon="lucide:arrow-left" width="24px" height="24px" />
	<span class={visuallyHidden()}>Back</span>
</Button>
