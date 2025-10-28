<script lang="ts">
	import Icon from '@iconify/svelte';
	import { visuallyHidden } from '@pindoba/styled-system/patterns';
	import Button from '@pindoba/svelte-button';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	interface Props {
		repositoryId: string;
	}

	const { repositoryId }: Props = $props();

	function navigateBack() {
		goto(resolve(`/repos/${repositoryId}`));
	}
</script>

<Button emphasis="ghost" size="md" onclick={navigateBack} shape="square" data-testid="back-button">
	<Icon icon="lucide:arrow-left" width="24px" height="24px" />
	<span class={visuallyHidden()}>Back</span>
</Button>
