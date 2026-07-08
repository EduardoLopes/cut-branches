<script lang="ts">
	import { useQueryClient } from '@tanstack/svelte-query';
	import { type Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { refreshCleanupSummary } from '$domains/repository-cleanup/core/composables/use-cleanup-summary.svelte';
	import AddRepositoryMenu from '$domains/repository-management/components/add-repository-menu.svelte';
	import SidebarView from '$domains/repository-navigation/views/sidebar-view.svelte';
	import { isFeatureEnabled } from '$lib/feature-flags.svelte';
	import { css } from '@pindoba/styled-system/css';

	const queryClient = useQueryClient();

	interface Props {
		/** Main content rendered next to the sidebar. */
		children?: Snippet;
	}

	let { children }: Props = $props();

	// Populate the sidebar's reclaimable-space badge with a one-time background
	// scan at startup (composition-root concern; §4). Gated by the feature flag.
	let summaryScanned = false;
	$effect(() => {
		if (!summaryScanned && isFeatureEnabled('repository-cleanup')) {
			summaryScanned = true;
			void refreshCleanupSummary(queryClient);
		}
	});
</script>

<div
	class={css({
		width: '100%',
		flex: 1,
		minHeight: 0,
		display: 'flex',
		flexDirection: 'column'
	})}
>
	<div
		class={css({
			display: 'grid',
			gridTemplateColumns: 'max-content auto',
			// Bound the single row to the container height (minmax(0,1fr) instead of
			// the default `auto`, which would grow to fit content) so the sidebar and
			// main column can scroll internally rather than stretching the page.
			gridTemplateRows: 'minmax(0, 1fr)',
			flex: 1,
			minHeight: 0
		})}
	>
		<SidebarView>
			{#snippet repositoryListAction()}
				<AddRepositoryMenu
					size="sm"
					emphasis="secondary"
					icon="material-symbols:add-rounded"
					visuallyHiddenLabel
					withRepositorySort
					withManageRepositories
					onSuccess={(data) => goto(resolve(`/repos/${data.id}`))}
				/>
			{/snippet}
		</SidebarView>
		{@render children?.()}
	</div>
</div>
