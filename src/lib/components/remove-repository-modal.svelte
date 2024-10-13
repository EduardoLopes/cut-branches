<script lang="ts">
	import { type RepoID } from '$lib/stores/branches';
	import Icon from '@iconify/svelte';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';
	import { repos } from '$lib/stores/branches';
	import Button from '@pindoba/svelte-button';
	import Dialog from '@pindoba/svelte-dialog';

	interface Props {
		currentRepo: RepoID;
	}

	let open = $state(false);

	let { currentRepo }: Props = $props();

	function handleRemove() {
		$repos = $repos.filter((item) => {
			return item.id !== currentRepo?.id;
		});

		open = false;
	}

	function handleCancel() {
		open = false;
	}
</script>

<Dialog
	bind:open
	title="Remove repository"
	aria-label="Remove repository"
	aria-describedby="Remove repository"
>
	<p>
		Are you sure you want to remove the repository <strong
			class={css({
				color: 'danger.800',
				fontSize: 'lg'
			})}>{currentRepo?.name}</strong
		>?
	</p>

	<div
		class={css({
			display: 'flex',
			justifyContent: 'flex-end',
			gap: 'md'
		})}
	>
		<Button emphasis="secondary" onclick={handleCancel}>Cancel</Button>
		<Button feedback="danger" autofocus onclick={handleRemove}>Remove</Button>
	</div>
</Dialog>

<Button
	emphasis="ghost"
	size="sm"
	feedback="danger"
	onclick={() => {
		open = true;
	}}
	shape="square"
>
	<Icon icon="solar:close-circle-linear" width="24px" height="24px" />
	<span class={visuallyHidden()}>Remove</span>
</Button>
