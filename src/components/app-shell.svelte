<script lang="ts">
	import { Devtools } from '@pindoba/devtools';
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

	// Pindoba live design-token editor. Dev-only, like the TanStack Query
	// devtools in the footer: the `import.meta.env.DEV` guards below become
	// `false` in production, so the `{#if}` block is dead-code eliminated and the
	// `@pindoba/devtools` import tree-shakes out of the release bundle. Mounted
	// once at the shell so it persists across routes while tokens are tweaked;
	// the built-in floating trigger is suppressed and it's opened from the
	// sidebar footer (Ctrl/Cmd+K also works).
	let devtoolsOpen = $state(false);

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
			// The main column is minmax(0,1fr), not `auto`: an auto track's minimum
			// is its content's max-content size, so one wide unwrappable line (e.g.
			// a diff hunk) would blow the column past the viewport and defeat every
			// inner horizontal scrollbar. minmax(0,1fr) fills the remaining space
			// but lets content overflow-scroll inside it.
			gridTemplateColumns: 'max-content minmax(0, 1fr)',
			// Bound the single row to the container height (minmax(0,1fr) instead of
			// the default `auto`, which would grow to fit content) so the sidebar and
			// main column can scroll internally rather than stretching the page.
			gridTemplateRows: 'minmax(0, 1fr)',
			flex: 1,
			minHeight: 0
		})}
	>
		<SidebarView onOpenDevtools={import.meta.env.DEV ? () => (devtoolsOpen = true) : undefined}>
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

{#if import.meta.env.DEV}
	<Devtools bind:open={devtoolsOpen} hideTrigger />
{/if}
