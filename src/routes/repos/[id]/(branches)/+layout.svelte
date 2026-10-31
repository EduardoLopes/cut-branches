<script lang="ts">
	// Thin composition root for the branches page. Active (`/repos/[id]`) and
	// deleted (`/repos/[id]/restore`) branches are one view over one page, so it
	// lives in this layout rather than in either page: moving between them keeps
	// the view (and its toolbar) mounted instead of rebuilding it per route.
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import BranchesView from '$domains/branch-management/views/branches-view.svelte';

	interface Props {
		children?: Snippet;
	}

	const { children }: Props = $props();

	const id = $derived(page.params.id ?? '');
	const context = $derived(page.url.pathname.endsWith('/restore') ? 'deleted' : 'active');
</script>

<BranchesView {id} {context} />
{@render children?.()}
