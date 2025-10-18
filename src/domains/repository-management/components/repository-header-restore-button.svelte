<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { css } from '@pindoba/panda/css';

	interface Props {
		repositoryId: string;
	}

	const { repositoryId }: Props = $props();

	function navigateToRestore() {
		goto(resolve(`/repos/${repositoryId}/restore`));
	}
</script>

<Button
	emphasis="ghost"
	size="sm"
	onclick={navigateToRestore}
	data-testid="restore-navigate-button"
	class={css({
		gap: 'sm'
	})}
>
	<Icon icon="lucide:undo" width="24px" height="24px" />
	<span>Restore</span>
</Button>
