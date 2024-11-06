<script lang="ts">
	import { getLockedBranchesStore } from '$lib/stores/locked-branches.svelte';
	import { repositories } from '$lib/stores/repos.svelte';
	import Icon from '@iconify/svelte';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';
	import Button from '@pindoba/svelte-button';

	interface Props {
		branch: string;
		repositoryID?: string;
	}

	let { branch, repositoryID }: Props = $props();

	const currentRepo = $derived(repositories.findById(repositoryID));
	const locked = $derived(getLockedBranchesStore(currentRepo?.name));
</script>

<Button
	size="xs"
	shape={'square'}
	emphasis={locked.has(branch) ? 'primary' : 'secondary'}
	class={css({
		width: '26px',
		height: '26px'
	})}
	passThrough={{
		root: css.raw({
			boxShadow: 'none'
		})
	}}
	onclick={() => {
		if (locked.has(branch)) {
			locked.remove([branch]);
		} else {
			locked.add([branch]);
		}
	}}
>
	{#if locked.has(branch)}
		<Icon icon="lucide:lock" width="12px" height="12px" />
	{/if}

	{#if !locked.has(branch)}
		<Icon icon="lucide:lock-open" width="12px" height="12px" />
	{/if}

	<span class={visuallyHidden()}>
		{locked.has(branch) ? 'unlock' : 'lock'}
	</span>
</Button>
