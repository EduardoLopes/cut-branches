<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Stamp from '@pindoba/svelte-stamp';
	import { revealItemInDir } from '@tauri-apps/plugin-opener';
	import { createGetRepositoryListQuery } from '$infrastructure/queries/create-get-repository-list-query';
	import { notifications } from '$services/notifications/notifications.svelte';

	interface Props {
		repositoryId: string;
	}

	const { repositoryId }: Props = $props();

	const getRepositoryListQuery = createGetRepositoryListQuery();

	const repository = $derived(
		getRepositoryListQuery.data?.find((repo) => repo.id === repositoryId)
	);

	async function handleReveal() {
		if (!repository) return;

		try {
			// Opens the OS file manager (Finder / Explorer / etc.) with the
			// repository folder highlighted in its parent directory.
			await revealItemInDir(repository.path);
		} catch (error) {
			notifications.push({
				title: 'Could not open folder',
				message: `Failed to reveal **${repository.name}** in the file manager`,
				feedback: 'danger'
			});
			console.error('revealItemInDir failed', error);
		}
	}
</script>

<Button
	emphasis="ghost"
	size="md"
	onclick={handleReveal}
	disabled={!repository}
	title="Reveal in file manager"
	aria-label="Reveal repository in file manager"
	data-testid="reveal-button"
>
	Reveal in Finder
	{#snippet trailing()}
		<Stamp emphasis="ghost" border="none" background="transparent">
			<Icon icon="lucide:folder-open" width="16px" height="16px" />
		</Stamp>
	{/snippet}
</Button>
