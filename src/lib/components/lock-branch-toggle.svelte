<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import { getLockedBranchesStore } from '$lib/stores/locked-branches.svelte';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';

	interface Props {
		branch: string;
		repositoryID?: string;
		disabled?: boolean;
	}

	let { branch, repositoryID, disabled = false }: Props = $props();

	const locked = $derived(getLockedBranchesStore(repositoryID));
</script>

<Button
	size="xs"
	shape="square"
	emphasis={locked?.has(branch) ? 'primary' : 'secondary'}
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
		if (locked?.has(branch)) {
			locked?.delete([branch]);
		} else {
			locked?.add([branch]);
		}
	}}
	data-testid="lock-toggle-button"
	aria-label={locked?.has(branch) ? 'Unlock branch' : 'Lock branch'}
	{disabled}
>
	{#if locked?.has(branch)}
		<div data-testid="lock-icon">
			<Icon icon="lucide:lock" width="12px" height="12px" />
		</div>
	{/if}

	{#if !locked?.has(branch)}
		<div data-testid="unlock-icon">
			<Icon icon="lucide:lock-open" width="12px" height="12px" />
		</div>
	{/if}

	<span class={visuallyHidden()}>
		{locked?.has(branch) ? 'unlock' : 'lock'}
	</span>
</Button>
