<script lang="ts">
	import Badge from '@pindoba/svelte-badge';
	import GridList from '@pindoba/svelte-grid-list';
	import type { CleanupTarget } from '$infrastructure/bindings';
	import TruncatedPath from '$ui/core/truncated-path.svelte';
	import { formatBytes } from '$utils/format-bytes';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		targets: CleanupTarget[];
		isSelected: (path: string) => boolean;
		onToggle: (path: string) => void;
		/**
		 * Draw the column header, whose checkbox selects every target. Off where
		 * the host already has a select-all for these rows (the bulk view's
		 * per-repository header).
		 * @default false
		 */
		header?: boolean;
	}

	let { targets, isSelected, onToggle, header = false }: Props = $props();

	const selected = $derived(
		new Set(targets.filter((target) => isSelected(target.path)).map((target) => target.path))
	);

	/** The list reports whole sets (a checkbox, a range, ⌘A, Esc); the hosts
	 *  toggle one path at a time, so replay the difference. */
	function handleSelectionChange(next: Set<string>) {
		for (const target of targets) {
			if (next.has(target.path) !== selected.has(target.path)) onToggle(target.path);
		}
	}

	const nameClass = css({ fontSize: 'sm', fontWeight: 'medium', whiteSpace: 'nowrap' });
	const pathClass = css({ fontSize: 'xs', minWidth: '0' });
	const sizeCellClass = css({ justifyContent: 'flex-end' });
</script>

<!--
	Just the rows: the host decides how they scroll (the cleanup modal puts them
	in a ScrollWell, the bulk view in an accordion). One line per folder — the
	name leads, the path truncates in the middle with the folder highlighted so
	it lands in the same column on every row — and the size pins to the end.
-->
<GridList
	label="Folders to clean"
	items={targets}
	getId={(target: CleanupTarget) => target.path}
	rowName={(target: CleanupTarget) => target.path}
	selectable
	{header}
	selectAll={header ? 'header' : false}
	value={selected}
	onValueChange={handleSelectionChange}
	tone="danger"
	look="cards"
	rowBackground="surface.peak"
	data-testid="cleanup-target-list"
	columns={[
		{ id: 'name', track: 'auto', header: 'Folder' },
		{ id: 'path', track: 'minmax(0, 1fr)', header: 'Path' },
		{ id: 'size', track: 'auto', header: 'Size' }
	]}
>
	{#snippet row(target, { cell })}
		<span {...cell('name', { class: nameClass })} data-testid="cleanup-target">
			{target.folderName}
		</span>
		<span {...cell('path')}>
			<TruncatedPath
				path={target.path}
				highlight={target.folderName}
				align="end"
				class={pathClass}
				data-testid="cleanup-target-path"
			/>
		</span>
		<span {...cell('size', { class: sizeCellClass })}>
			<Badge size="sm" emphasis="adaptive" data-testid="cleanup-target-size">
				{formatBytes(target.sizeBytes)}
			</Badge>
		</span>
	{/snippet}
</GridList>
