<script lang="ts">
	import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { BulkAction, BulkSelection } from '@pindoba/core-bulk-bar';
	import BulkBar, { type BulkBarIcon } from '@pindoba/svelte-bulk-bar';
	import { gridListFocusTarget } from '@pindoba/svelte-grid-list';
	import { useBranchSelection } from '$domains/branch-management/core/composables/use-branch-selection.svelte';
	import type { Repository } from '$types/repository';

	interface Props {
		repository: Repository | undefined;
		branchContext: 'active' | 'deleted';
		/** The bar's single action ran: delete (active) or restore (deleted). */
		onAction: () => void;
		/** The branch list's root: focus returns to its select-all (or its
		 *  focused row) when the selection empties under the bar. */
		listElement?: HTMLElement | null;
	}

	const { repository, branchContext, onAction, listElement }: Props = $props();

	const selection = useBranchSelection({
		repository: () => repository,
		branchContext: () => branchContext
	});

	// The selection lives in the database, not in a Set, so the snapshot is built
	// from the composable's counts. They already describe the same set — the
	// selectable branches the search leaves on screen — so the page and the
	// collection are one: "Select all N" covers exactly what the toolbar's
	// select-all covers.
	const selected: BulkSelection = $derived({
		count: selection.selectedCount,
		pageCount: selection.selectibleCount,
		pageSelected: selection.selectedCount,
		total: selection.selectibleCount,
		clear: () => void selection.clearSelection(),
		selectAll: () => void selection.selectAll()
	});

	const actions: BulkAction<BulkBarIcon>[] = $derived(
		branchContext === 'active'
			? [{ id: 'delete', label: 'Delete', icon: Trash2, tone: 'danger' }]
			: [{ id: 'restore', label: 'Restore', icon: ArchiveRestore }]
	);
</script>

<!-- Focus falls back to the list (its select-all, else its focused row) when
     the selection empties under a focused bar button, rather than to <body>. -->
<BulkBar
	{selected}
	{actions}
	onAction={() => onAction()}
	returnFocus={() => (listElement ? gridListFocusTarget(listElement) : null)}
	labels={{ toolbar: 'Branch actions' }}
	data-testid="branch-bulk-bar"
/>
