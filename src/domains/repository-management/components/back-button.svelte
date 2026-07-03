<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Stamp from '@pindoba/svelte-stamp';
	import Tooltip from '@pindoba/svelte-tooltip';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { visuallyHidden } from '@pindoba/styled-system/patterns';

	interface Props {
		repositoryId: string;
	}

	const { repositoryId }: Props = $props();

	function navigateBack() {
		goto(resolve(`/repos/${repositoryId}`));
	}
</script>

<Tooltip content="Back">
	{#snippet children(triggerProps)}
		<Button
			emphasis="ghost"
			size="md"
			onclick={navigateBack}
			shape="square"
			data-testid="back-button"
			{...triggerProps}
		>
			<Stamp emphasis="ghost" border="none" background="transparent">
				<Icon icon="lucide:arrow-left" width="24px" height="24px" />
			</Stamp>
			<span class={visuallyHidden()}>Back</span>
		</Button>
	{/snippet}
</Tooltip>
