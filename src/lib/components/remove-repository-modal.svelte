<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Dialog from '@pindoba/svelte-dialog';
	import { goto } from '$app/navigation';
	import { getRepositoryStore, RepositoryStore } from '$lib/stores/repository.svelte';
	import { type Repository } from '$lib/stores/repository.svelte';
	import { getSearchBranchesStore } from '$lib/stores/search-branches.svelte';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';

	interface Props {
		currentRepo: Repository;
	}

	let open = $state(false);

	let { currentRepo }: Props = $props();

	const search = $derived(getSearchBranchesStore(currentRepo?.name));
	const repository = $derived(getRepositoryStore(currentRepo?.name));
	const selected = $derived(getRepositoryStore(currentRepo?.name));
	function handleRemove() {
		open = false;

		RepositoryStore.repositories?.delete([repository?.state?.name]);
		repository?.clear();
		search?.clear();
		selected?.clear();

		const first = RepositoryStore.repositories?.list[0];

		goto(first ? `/repos/${first}` : `/add-first`);
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
	data-testid="remove-modal"
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
		<Button emphasis="secondary" onclick={handleCancel} data-testid="cancel-remove">Cancel</Button>
		<Button feedback="danger" autofocus onclick={handleRemove} data-testid="confirm-remove"
			>Remove</Button
		>
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
	data-testid="open-remove-modal"
>
	<Icon icon="solar:close-circle-linear" width="24px" height="24px" />
	<span class={visuallyHidden()}>Remove</span>
</Button>
