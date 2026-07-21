<script lang="ts">
	// One file panel on the diff canvas: identity (status, path, ± stats),
	// the changed symbols, and the file's import-impact counts. Expanded
	// nodes (the default) embed the file's ACTUAL DIFF via the same
	// FileDiffPanel the list rows use — the diff scrolls inside a
	// fixed-height area the LAYOUT already reserved, so nothing overlaps.
	// The header toggles the diff; a secondary button jumps to the file's
	// row in the list view instead.
	//
	// The collapsed row heights are pixel-pinned to the constants in
	// canvas-layout.ts — the layout computes node heights instead of
	// measuring them, so any drift here would clip content.
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import Stamp from '@pindoba/svelte-stamp';
	import {
		NODE_PADDING,
		NODE_ROW_HEIGHT,
		NODE_SYMBOL_LIMIT,
		SYMBOL_ROW_HEIGHT,
		type CanvasNode
	} from '../models/canvas-layout';
	import type { FileStructureInfo } from '../models/structure-index';
	import FileDiffPanel from './file-diff-panel.svelte';
	import type { ChangedFile, FileChangeStatus, SymbolKind } from '$infrastructure/bindings';
	import type {
		DiffViewerGutter,
		DiffViewerLayout,
		DiffViewerVariant
	} from '$ui/patterns/diff-viewer/types';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		file: ChangedFile;
		/** Position and computed size from the layout model. */
		node: CanvasNode;
		/** Changed symbols + impact counts; undefined for unparsed files. */
		structure?: FileStructureInfo;
		/** Whether this node currently shows its diff in place. */
		expanded?: boolean;
		/** Whether the diff panel actually MOUNTS: the canvas gates this on
		 *  viewport proximity so an expanded 400-node board doesn't fire 400
		 *  diff fetches at once. The layout slot is reserved either way. */
		renderDiff?: boolean;
		/** Diff fetching context (same contract as the list rows). */
		repositoryPath: string;
		branchName?: string | null;
		commitSha?: string | null;
		/** Diff presentation options, passed through to the panel. */
		diffLayout?: DiffViewerLayout;
		diffVariant?: DiffViewerVariant;
		diffGutter?: DiffViewerGutter;
		diffWrap?: boolean;
		/** Whether the pointer is over this node (drives edge highlighting). */
		onHover?: (path: string | null) => void;
		/** Toggle the in-place diff. */
		onToggle: (path: string) => void;
		/** Focus this file: the canvas narrows to it and its related files. */
		onFocus: (path: string) => void;
		/** Open the file's row in the list view instead. */
		onOpenInList: (path: string) => void;
	}

	let {
		file,
		node,
		structure = undefined,
		expanded = false,
		renderDiff = false,
		repositoryPath,
		branchName = null,
		commitSha = null,
		diffLayout = 'unified',
		diffVariant = 'background',
		diffGutter = 'single',
		diffWrap = false,
		onHover = undefined,
		onToggle,
		onFocus,
		onOpenInList
	}: Props = $props();

	const STATUS_FEEDBACK: Record<FileChangeStatus, 'success' | 'danger' | 'primary' | 'warning'> = {
		added: 'success',
		deleted: 'danger',
		modified: 'primary',
		renamed: 'warning'
	};
	const SYMBOL_GLYPH: Record<SymbolKind, string> = {
		function: 'ƒ',
		method: 'ƒ',
		class: 'C',
		component: '◇'
	};

	const symbols = $derived(structure?.symbols ?? []);
	const shownSymbols = $derived(symbols.slice(0, NODE_SYMBOL_LIMIT));
	const hiddenCount = $derived(symbols.length - shownSymbols.length);

	// Geometry always comes from the layout — expanded nodes got a bigger
	// slot there, so the board reflows instead of overlapping.
	const nodeGeometry = $derived(
		`left: ${node.x}px; top: ${node.y}px; width: ${node.width}px; height: ${node.height}px;`
	);

	const nodePanel = css({
		position: 'absolute',
		display: 'flex',
		flexDirection: 'column',
		padding: `${NODE_PADDING}px`,
		textAlign: 'left',
		background: 'neutral.surface.step.2',
		border: '1px solid token(colors.neutral.border.muted)',
		borderRadius: 'sm',
		overflow: 'clip',
		'&[data-expanded="true"]': {
			borderColor: 'primary.border',
			boxShadow: 'lg'
		}
	});
	const headerRow = css({
		display: 'flex',
		alignItems: 'center',
		gap: 'xs',
		height: `${NODE_ROW_HEIGHT}px`,
		flexShrink: '0',
		minWidth: '0'
	});
	const toggleButton = css({
		display: 'flex',
		alignItems: 'center',
		gap: 'xs',
		flex: '1',
		minWidth: '0',
		cursor: 'pointer',
		background: 'transparent',
		border: 'none',
		padding: '0',
		color: 'inherit',
		_focusVisible: {
			outline: '2px solid token(colors.primary.border)',
			outlineOffset: '1px'
		}
	});
	const pathText = css({
		fontFamily: 'mono',
		fontSize: 'xs',
		fontWeight: 'bold',
		minWidth: '0',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		direction: 'rtl',
		textAlign: 'left'
	});
	const statsRow = css({
		display: 'flex',
		alignItems: 'center',
		gap: 'xs',
		height: `${NODE_ROW_HEIGHT}px`,
		flexShrink: '0',
		fontSize: 'xs',
		color: 'neutral.text.muted'
	});
	const symbolRow = css({
		display: 'block',
		fontFamily: 'mono',
		fontSize: 'xs',
		lineHeight: `${SYMBOL_ROW_HEIGHT}px`,
		height: `${SYMBOL_ROW_HEIGHT}px`,
		flexShrink: '0',
		color: 'neutral.text.muted',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap'
	});
	// The embedded diff fills the fixed-height area the layout reserved and
	// scrolls inside it; the canvas ignores wheel events over it (see
	// diff-canvas.svelte), so the diff's own wheel routing works exactly as
	// it does in the list.
	const diffArea = css({
		flex: '1',
		minHeight: '0',
		overflowY: 'auto',
		overscrollBehavior: 'contain'
	});
</script>

<div
	class={nodePanel}
	style={nodeGeometry}
	data-canvas-node={file.path}
	data-expanded={expanded ? 'true' : undefined}
	data-testid="canvas-file-node"
	role="group"
	aria-label={file.path}
	onmouseenter={() => onHover?.(file.path)}
	onmouseleave={() => onHover?.(null)}
>
	<span class={headerRow}>
		<button
			type="button"
			class={toggleButton}
			title={file.path}
			aria-expanded={expanded}
			aria-label={`${expanded ? 'Hide' : 'Show'} diff of ${file.path}`}
			data-testid="canvas-node-toggle"
			onclick={() => onToggle(file.path)}
		>
			<Badge size="xs" emphasis="secondary" feedback={STATUS_FEEDBACK[file.status]}>
				{file.status}
			</Badge>
			<span class={pathText}>&lrm;{file.path}</span>
		</button>
		<Button
			emphasis="ghost"
			size="xs"
			shape="square"
			onclick={() => onFocus(file.path)}
			aria-label={`Focus on ${file.path} and related files`}
			title="Focus on this file and its related files"
			data-testid="canvas-node-focus"
		>
			<Stamp emphasis="ghost" border="none" background="transparent">
				<Icon icon="lucide:crosshair" width="12px" height="12px" />
			</Stamp>
		</Button>
		<Button
			emphasis="ghost"
			size="xs"
			shape="square"
			onclick={() => onOpenInList(file.path)}
			aria-label={`Open ${file.path} in list`}
			title="Open in list"
			data-testid="canvas-node-open-in-list"
		>
			<Stamp emphasis="ghost" border="none" background="transparent">
				<Icon icon="lucide:list" width="12px" height="12px" />
			</Stamp>
		</Button>
	</span>
	<span class={statsRow}>
		{#if file.isBinary}
			<Badge size="xs" emphasis="secondary" feedback="neutral">binary</Badge>
		{:else}
			<Badge size="xs" emphasis="secondary" feedback="success">+{file.linesAdded}</Badge>
			<Badge size="xs" emphasis="secondary" feedback="danger">−{file.linesRemoved}</Badge>
		{/if}
		{#if structure && structure.importsChanged > 0}
			<span
				title={`Imports ${structure.importsChanged} changed ${structure.importsChanged === 1 ? 'file' : 'files'}`}
				data-testid="canvas-node-imports"
			>
				<Stamp emphasis="ghost" border="none" background="transparent">
					<Icon icon="lucide:arrow-up-right" width="12px" height="12px" />
				</Stamp>{structure.importsChanged}
			</span>
		{/if}
		{#if structure && structure.importedByChanged > 0}
			<span
				title={`Imported by ${structure.importedByChanged} changed ${structure.importedByChanged === 1 ? 'file' : 'files'}`}
				data-testid="canvas-node-imported-by"
			>
				<Stamp emphasis="ghost" border="none" background="transparent">
					<Icon icon="lucide:arrow-down-left" width="12px" height="12px" />
				</Stamp>{structure.importedByChanged}
			</span>
		{/if}
	</span>
	{#each shownSymbols as symbol (symbol.name + symbol.startLine)}
		<span class={symbolRow} data-testid="canvas-node-symbol">
			{SYMBOL_GLYPH[symbol.kind]}
			{symbol.name}
		</span>
	{/each}
	{#if hiddenCount > 0}
		<span class={symbolRow}>+{hiddenCount} more</span>
	{/if}
	{#if expanded && renderDiff}
		<div class={diffArea} data-canvas-diff data-testid="canvas-node-diff">
			<FileDiffPanel
				{repositoryPath}
				{branchName}
				{commitSha}
				{file}
				layout={diffLayout}
				variant={diffVariant}
				gutter={diffGutter}
				wrap={diffWrap}
			/>
		</div>
	{:else if expanded}
		<!-- Slot reserved by the layout; the panel mounts when panned near. -->
		<div class={diffArea} data-testid="canvas-node-diff-placeholder"></div>
	{/if}
</div>
