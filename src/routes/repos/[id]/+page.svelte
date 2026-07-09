<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { MenuNode } from '@pindoba/core-menu';
	import Stamp from '@pindoba/svelte-stamp';
	import { page } from '$app/state';
	import RepositoryContextSwitch from '$components/repository-context-switch.svelte';
	import ActiveBranchesView from '$domains/branch-management/views/active-branches-view.svelte';
	import CleanRepositoryModal from '$domains/repository-cleanup/components/clean-repository-modal.svelte';
	import Repository from '$domains/repository-management/views/repository-view.svelte';
	import { isFeatureEnabled } from '$lib/feature-flags.svelte';
	import { css } from '@pindoba/styled-system/css';

	const id = $derived(page.params.id ?? '');

	// Composition root (§1.3, §4): the per-repository cleanup action lives in the
	// repository-cleanup domain, but is composed into repository-management's
	// options menu here so neither domain imports the other.
	let cleanupOpen = $state(false);

	const extraMenuItems = $derived<MenuNode[]>(
		isFeatureEnabled('repository-cleanup')
			? [
					{
						type: 'action',
						id: 'cleanup',
						label: 'Clean up…',
						leading: cleanupIcon,
						onSelect: () => (cleanupOpen = true)
					}
				]
			: []
	);
</script>

{#snippet cleanupIcon()}
	<Stamp size="sm" emphasis="ghost" border="none" background="transparent">
		<Icon icon="lucide:brush-cleaning" width="14px" height="14px" />
	</Stamp>
{/snippet}

{#snippet contextSwitch()}
	<RepositoryContextSwitch {id} />
{/snippet}

<div
	class={css({
		width: 'full',
		height: 'full'
	})}
>
	<Repository repositoryId={id} {extraMenuItems} {contextSwitch}>
		<ActiveBranchesView {id} />
	</Repository>

	{#if isFeatureEnabled('repository-cleanup')}
		<CleanRepositoryModal repositoryId={id} bind:open={cleanupOpen} />
	{/if}
</div>
