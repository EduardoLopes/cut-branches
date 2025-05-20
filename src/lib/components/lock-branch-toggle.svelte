<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import { getLockedBranchesStore } from '$lib/stores/locked-branches.svelte';
	import { getSelectedBranchesStore } from '$lib/stores/selected-branches.svelte';
	import { formatString } from '$lib/utils/string-utils';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';

	interface Props {
		branch: string;
		repositoryID?: string;
		disabled?: boolean;
	}

	let { branch, repositoryID, disabled = false }: Props = $props();

	const selected = $derived(getSelectedBranchesStore(repositoryID));
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
			selected?.delete([branch]);
		}
	}}
	data-testid="lock-toggle-button"
	aria-label={formatString('{action} branch {name}', {
		action: locked?.has(branch) ? 'unlock' : 'lock',
		name: branch
	})}
	{disabled}
>
	{#if locked?.has(branch)}
		<div data-testid="lock-icon">
			<Icon icon="lucide:lock" width="14px" height="14px" />
		</div>
	{/if}

	{#if !locked?.has(branch)}
		<div data-testid="unlock-icon">
			<Icon icon="lucide:lock-open" width="14px" height="14px" />
		</div>
	{/if}

	<span class={visuallyHidden()}>
		{formatString('{action} branch {name}', {
			action: locked?.has(branch) ? 'unlock' : 'lock',
			name: branch
		})}
	</span>
</Button>
