<script lang="ts">
	import LucideFolder from '@lucide/svelte/icons/folder';
	import type { GridListPadding } from '@pindoba/core-grid-list';
	import Badge from '@pindoba/svelte-badge';
	import GridList, { type GridListGroupContext } from '@pindoba/svelte-grid-list';
	import Stamp from '@pindoba/svelte-stamp';
	import type { Snippet } from 'svelte';
	import type { CleanupTarget } from '$infrastructure/bindings';
	import Icon from '$ui/core/icon.svelte';
	import TruncatedPath from '$ui/core/truncated-path.svelte';
	import { formatBytes } from '$utils/format-bytes';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** The folders, sorted by group when `groupOf` is set. */
		targets: CleanupTarget[];
		isSelected: (path: string) => boolean;
		onToggle: (path: string) => void;
		/**
		 * Group the folders (e.g. by repository). Each group title gets a
		 * collapse chevron and a checkbox that selects the whole group.
		 */
		groupOf?: (target: CleanupTarget) => string;
		/** Content at the end of each group title (its size, when it was active). */
		groupTrailing?: Snippet<[GridListGroupContext<CleanupTarget>]>;
		/** Be its own scroll port (the header and group titles pin to its top). */
		scroll?: boolean;
		/** Padding around the list (outside the scroll area with `scroll`). */
		padding?: GridListPadding;
		class?: string;
	}

	let {
		targets,
		isSelected,
		onToggle,
		groupOf,
		groupTrailing,
		scroll = false,
		padding,
		class: className
	}: Props = $props();

	const selected = $derived(
		new Set(targets.filter((target) => isSelected(target.path)).map((target) => target.path))
	);

	/** The list reports whole sets (a checkbox, a range, a group, ⌘A, Esc); the
	 *  hosts toggle one path at a time, so replay the difference. */
	function handleSelectionChange(next: Set<string>) {
		for (const target of targets) {
			if (next.has(target.path) !== selected.has(target.path)) onToggle(target.path);
		}
	}

	const iconCellClass = css({ justifyContent: 'center', color: 'neutral.text.muted' });
	const nameClass = css({ fontSize: 'sm', fontWeight: 'medium', whiteSpace: 'nowrap' });
	const pathClass = css({ fontSize: 'xs', minWidth: '0' });
	const sizeCellClass = css({ justifyContent: 'flex-end' });
</script>

<!--
	One line per folder — the name leads, the path truncates in the middle with
	the folder highlighted so it lands in the same column on every row — and the
	size pins to the end. The host decides how it scrolls: inside a ScrollWell
	(the cleanup dialog) or as its own port (`scroll`, the bulk view).
-->
<GridList
	label="Folders to clean"
	items={targets}
	getId={(target: CleanupTarget) => target.path}
	rowName={(target: CleanupTarget) => target.path}
	selectable
	header
	{groupOf}
	groupSelect={groupOf !== undefined}
	{groupTrailing}
	{scroll}
	{padding}
	class={className}
	value={selected}
	onValueChange={handleSelectionChange}
	tone="danger"
	look="cards"
	rowBackground="surface.peak"
	groupBackground="surface.hill"
	data-testid="cleanup-target-list"
	selectOver="icon"
	columns={[
		// The checkbox lies over the folder glyph: no blank column at rest.
		{ id: 'icon', track: 'auto', srHeader: 'Type' },
		{ id: 'name', track: 'auto', header: 'Folder' },
		{ id: 'path', track: 'minmax(0, 1fr)', header: 'Path' },
		{ id: 'size', track: 'auto', header: 'Size' }
	]}
>
	{#snippet row(target, { cell })}
		<span {...cell('icon', { class: iconCellClass })}>
			<Stamp size="sm" emphasis="ghost" border="none" background="transparent">
				<Icon icon={LucideFolder} width="14px" height="14px" />
			</Stamp>
		</span>
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
