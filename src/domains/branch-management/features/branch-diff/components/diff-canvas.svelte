<script lang="ts">
	// The diff canvas: changed files as node panels on a pannable/zoomable
	// board, laid out in dependency columns (see canvas-layout.ts). Pure
	// delivery: the view owns the queries and passes data in.
	//
	// Pan/zoom writes a transform directly on the content element instead of
	// going through reactive state — a wheel gesture fires dozens of events a
	// second and none of them need to re-render anything (the pattern the
	// commit-history graph rail established). Unlike the diff panels (which
	// route wheel events to the list scroller — see route-vertical-wheel.ts),
	// the canvas IS a viewport, so it consumes the wheel entirely: plain
	// wheel pans, ctrl/cmd+wheel (macOS pinch arrives as ctrl+wheel) zooms
	// toward the cursor.
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import Stamp from '@pindoba/svelte-stamp';
	import { tick } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { buildCanvasLayout, type CanvasLayout } from '../models/canvas-layout';
	import { buildStructureIndex, listRelatedPaths } from '../models/structure-index';
	import EdgeLayer from './edge-layer.svelte';
	import FileNode from './file-node.svelte';
	import type { ChangedFile, GetDiffStructureOutput } from '$infrastructure/bindings';
	import type {
		DiffViewerGutter,
		DiffViewerLayout,
		DiffViewerVariant
	} from '$ui/patterns/diff-viewer/types';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** The changed files to draw (already search-filtered by the view). */
		files: ChangedFile[];
		/** The structure analysis backing symbols and edges. */
		structure: GetDiffStructureOutput | undefined;
		/** Diff fetching context, threaded into expanded nodes. */
		repositoryPath: string;
		branchName?: string | null;
		commitSha?: string | null;
		/** Diff presentation options for expanded nodes. */
		diffLayout?: DiffViewerLayout;
		diffVariant?: DiffViewerVariant;
		diffGutter?: DiffViewerGutter;
		diffWrap?: boolean;
		/** Whether a file is currently marked reviewed (reactive). */
		isReviewed?: (path: string) => boolean;
		/** Flip a file's reviewed state. */
		onToggleReviewed?: (path: string) => void;
		/** A node's "open in list" action. */
		onOpenFile: (path: string) => void;
	}

	let {
		files,
		structure,
		repositoryPath,
		branchName = null,
		commitSha = null,
		diffLayout = 'unified',
		diffVariant = 'background',
		diffGutter = 'single',
		diffWrap = false,
		isReviewed = undefined,
		onToggleReviewed = undefined,
		onOpenFile
	}: Props = $props();

	// --- Focus mode --------------------------------------------------------------
	// Focusing a file narrows the board to that file and everything directly
	// related to it by an import edge — the review question "what does this
	// change touch?" answered spatially: its dependencies land in the columns
	// to its left, its dependents to its right.

	let focusedPath = $state<string | null>(null);
	/** The focus survives only while the file is on the board (search can
	 *  filter it away). */
	const activeFocus = $derived(
		focusedPath !== null && files.some((file) => file.path === focusedPath) ? focusedPath : null
	);

	async function focusFile(path: string) {
		focusedPath = path;
		await tick();
		fit();
	}

	async function clearFocus() {
		focusedPath = null;
		await tick();
		fit();
	}

	const structureIndex = $derived(buildStructureIndex(structure));
	/** The files the board currently shows (all, or a focus neighborhood). */
	const displayFiles = $derived.by(() => {
		if (activeFocus === null) {
			return files;
		}
		const related = listRelatedPaths(structure?.edges ?? [], activeFocus);
		return files.filter((file) => related.has(file.path));
	});

	// Diffs are expanded by default — the canvas is a review board, not just a
	// map. On very large changesets mounting every diff up front is too heavy,
	// so past the cap the board starts collapsed; the toolbar flips everything
	// either way, and each node header still toggles individually.
	const AUTO_EXPAND_MAX_FILES = 30;

	let expandMode = $state<'auto' | 'all' | 'none'>('auto');
	const defaultExpanded = $derived(
		expandMode === 'auto' ? displayFiles.length <= AUTO_EXPAND_MAX_FILES : expandMode === 'all'
	);
	/** Per-node deviations from the default. */
	const expandOverrides = new SvelteMap<string, boolean>();

	function isExpanded(path: string): boolean {
		return expandOverrides.get(path) ?? defaultExpanded;
	}

	function toggleDiff(path: string) {
		expandOverrides.set(path, !isExpanded(path));
	}

	function setAllExpanded(expanded: boolean) {
		expandOverrides.clear();
		expandMode = expanded ? 'all' : 'none';
	}

	const layout: CanvasLayout = $derived(
		buildCanvasLayout(
			displayFiles.map((file) => ({
				path: file.path,
				symbolCount: structureIndex.get(file.path)?.symbols.length ?? 0,
				expanded: isExpanded(file.path)
			})),
			structure?.edges ?? []
		)
	);
	const filesByPath = $derived(new Map(displayFiles.map((file) => [file.path, file])));
	const hasEdges = $derived(
		(structure?.edges ?? []).some((edge) => filesByPath.has(edge.from) && filesByPath.has(edge.to))
	);

	/** Node the pointer is over — drives edge highlighting. */
	let hoveredPath = $state<string | null>(null);

	// --- Pan/zoom ----------------------------------------------------------------

	const ZOOM_MIN = 0.25;
	const ZOOM_MAX = 2;

	let viewportElement = $state<HTMLElement | null>(null);
	let contentElement = $state<HTMLElement | null>(null);
	let zoomElement = $state<HTMLElement | null>(null);
	// Deliberately NOT $state: applied straight to the elements per event.
	let pan = { x: 0, y: 0 };
	let zoom = 1;
	/** The zoom currently BAKED into the crisp `zoom` property (see below). */
	let renderedZoom = 1;

	// Crisp zoom: a CSS scale() transform stretches a bitmap the browser
	// rasterized at 1×, so text goes blurry past it. During a gesture the
	// cheap composited scale keeps the interaction smooth; once it settles,
	// the scale is baked into the CSS `zoom` property on its own layer,
	// which re-lays-out and re-renders text at native sharpness. The
	// transform then carries only the pan (and the residual scale of the
	// next in-flight gesture, relative to the baked zoom).
	function applyTransform() {
		if (contentElement) {
			contentElement.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom / renderedZoom})`;
		}
		scheduleViewRectUpdate();
	}

	function bakeZoom() {
		if (zoom !== renderedZoom && zoomElement && contentElement) {
			renderedZoom = zoom;
			zoomElement.style.setProperty('zoom', String(zoom));
			contentElement.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(1)`;
		}
	}

	// --- Visibility-gated diff mounting -----------------------------------------
	// Mounting a FileDiffPanel means one IPC fetch plus a DiffViewer — fine
	// for what's on screen, a freeze if done for 400 nodes at once. Expanded
	// nodes therefore only MOUNT their diff while near the viewport; the
	// layout slot is always reserved (no reflow when panels stream in as you
	// pan). The view rect refreshes shortly after each gesture settles.

	/** Minimum overscan around the viewport, in content coordinates. */
	const DIFF_MOUNT_MARGIN = 800;
	const VIEW_RECT_DEBOUNCE_MS = 120;

	let viewRect = $state<{ x: number; y: number; width: number; height: number } | null>(null);
	let viewRectTimer = 0;

	function updateViewRect() {
		// The gesture has settled — re-render the zoom crisply first.
		bakeZoom();
		const bounds = viewportElement?.getBoundingClientRect();
		if (!bounds) {
			return;
		}
		viewRect = {
			x: -pan.x / zoom,
			y: -pan.y / zoom,
			width: bounds.width / zoom,
			height: bounds.height / zoom
		};
	}

	function scheduleViewRectUpdate() {
		clearTimeout(viewRectTimer);
		viewRectTimer = window.setTimeout(updateViewRect, VIEW_RECT_DEBOUNCE_MS);
	}

	$effect(() => {
		if (viewportElement) {
			updateViewRect();
		}
		return () => clearTimeout(viewRectTimer);
	});

	function shouldRenderDiff(node: {
		x: number;
		y: number;
		width: number;
		height: number;
	}): boolean {
		if (viewRect === null) {
			return false;
		}
		const margin = Math.max(DIFF_MOUNT_MARGIN, viewRect.width / 2, viewRect.height / 2);
		return (
			node.x < viewRect.x + viewRect.width + margin &&
			node.x + node.width > viewRect.x - margin &&
			node.y < viewRect.y + viewRect.height + margin &&
			node.y + node.height > viewRect.y - margin
		);
	}

	function zoomTowards(cursorX: number, cursorY: number, factor: number) {
		const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor));
		// Keep the content point under the cursor fixed while the scale moves.
		pan = {
			x: cursorX - ((cursorX - pan.x) / zoom) * next,
			y: cursorY - ((cursorY - pan.y) / zoom) * next
		};
		zoom = next;
		applyTransform();
	}

	/** Svelte action: non-passive wheel handling (pan; ctrl/cmd = zoom). */
	function canvasWheel(node: HTMLElement) {
		function onWheel(event: WheelEvent) {
			// Zoom gestures (pinch arrives as ctrl+wheel) ALWAYS belong to the
			// canvas — with diffs expanded by default the pointer is usually
			// over one, and ceding these to the diff scroller made zoom appear
			// to stop working entirely.
			if (event.ctrlKey || event.metaKey) {
				event.preventDefault();
				const bounds = node.getBoundingClientRect();
				zoomTowards(
					event.clientX - bounds.left,
					event.clientY - bounds.top,
					Math.exp(-event.deltaY * 0.01)
				);
				return;
			}
			// Plain scrolling over an expanded node's diff belongs to the diff
			// (its own scroller/routing), not to the canvas.
			if ((event.target as Element).closest('[data-canvas-diff]')) {
				return;
			}
			event.preventDefault();
			pan = { x: pan.x - event.deltaX, y: pan.y - event.deltaY };
			applyTransform();
		}
		node.addEventListener('wheel', onWheel, { passive: false });
		return {
			destroy() {
				node.removeEventListener('wheel', onWheel);
			}
		};
	}

	// Background drag pans; drags starting on a node stay clicks. Holding
	// SPACE turns on the Photoshop-style hand tool: the cursor becomes a
	// grab hand everywhere and dragging pans regardless of what is under
	// the pointer (nodes and diffs included).
	let dragging = $state(false);
	let handTool = $state(false);
	let last = { x: 0, y: 0 };

	/** Typing targets must keep their spacebar (e.g. the header search). */
	function isEditable(target: EventTarget | null): boolean {
		return !!(target as Element | null)?.closest?.('input, textarea, [contenteditable="true"]');
	}

	function onKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape' && activeFocus !== null) {
			clearFocus();
		}
		if (event.code === 'Space' && !isEditable(event.target)) {
			// Also keeps space from activating a focused button mid-pan.
			event.preventDefault();
			handTool = true;
		}
	}

	function onKeyUp(event: KeyboardEvent) {
		if (event.code === 'Space') {
			handTool = false;
		}
	}

	function onPointerDown(event: PointerEvent) {
		// Drag-panning is exclusively the hand tool's job (Photoshop
		// semantics): without space held, dragging does nothing — the wheel
		// and trackpad pan — and every click lands untouched. With it, the
		// whole board drags no matter what is under the pointer.
		if (!handTool) {
			return;
		}
		// Panning, not selecting: without this the drag sweeps a text
		// selection through every diff it passes over.
		event.preventDefault();
		dragging = true;
		last = { x: event.clientX, y: event.clientY };
		try {
			viewportElement?.setPointerCapture(event.pointerId);
		} catch {
			// Synthetic events (tests) have no active pointer to capture; the
			// drag still works, it just loses outside-the-window tracking.
		}
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging) {
			return;
		}
		pan = { x: pan.x + event.clientX - last.x, y: pan.y + event.clientY - last.y };
		last = { x: event.clientX, y: event.clientY };
		applyTransform();
	}

	function onPointerUp() {
		dragging = false;
	}

	/** Reset to a zoom that shows the whole board. */
	function fit() {
		// The button lives inside the viewport, so the element is bound by the
		// time this can run; layout dimensions are margin-padded, never zero.
		const bounds = (viewportElement as HTMLElement).getBoundingClientRect();
		zoom = Math.min(1, bounds.width / layout.width, bounds.height / layout.height);
		zoom = Math.max(ZOOM_MIN, zoom);
		pan = {
			x: Math.max(0, (bounds.width - layout.width * zoom) / 2),
			y: Math.max(0, (bounds.height - layout.height * zoom) / 2)
		};
		applyTransform();
	}

	const viewport = css({
		position: 'relative',
		flex: '1',
		overflow: 'clip',
		touchAction: 'none',
		background: 'neutral.surface.step.1',
		// Hand tool: the grab cursor wins over every child (nodes, buttons,
		// diff text) while space is held — and dragging must pan, not select
		// the text under the pointer.
		'&[data-hand="true"], &[data-hand="true"] *': { cursor: 'grab', userSelect: 'none' },
		'&[data-hand="true"][data-panning="true"], &[data-hand="true"][data-panning="true"] *': {
			cursor: 'grabbing'
		}
	});
	// Two elements on purpose: the wrapper's inline style is written ONLY
	// imperatively (the transform, per gesture frame), the board's ONLY
	// reactively (its size). Sharing one element would let Svelte's style
	// binding wipe the transform on every layout resize (diff toggles).
	const transformLayer = css({
		position: 'absolute',
		top: '0',
		left: '0',
		transformOrigin: '0 0'
	});
	const board = css({ position: 'relative' });
	const toolbar = css({
		position: 'absolute',
		top: 'sm',
		right: 'sm',
		zIndex: '2',
		display: 'flex',
		gap: 'xs'
	});
	const focusChip = css({
		position: 'absolute',
		top: 'sm',
		left: 'sm',
		zIndex: '2',
		display: 'flex',
		alignItems: 'center',
		gap: 'xs',
		fontSize: 'xs',
		color: 'neutral.text',
		background: 'neutral.surface.step.2',
		border: '1px solid token(colors.primary.border)',
		px: 'sm',
		py: '2xs',
		borderRadius: 'sm'
	});
	const emptyHint = css({
		position: 'absolute',
		bottom: 'sm',
		left: '50%',
		transform: 'translateX(-50%)',
		fontSize: 'xs',
		color: 'neutral.text.muted',
		background: 'neutral.surface.step.2',
		px: 'sm',
		py: '2xs',
		borderRadius: 'sm',
		zIndex: '2'
	});
</script>

<svelte:window onkeydown={onKeyDown} onkeyup={onKeyUp} />

<div
	class={viewport}
	role="application"
	aria-label="Changed files canvas"
	data-testid="diff-canvas"
	data-hand={handTool ? 'true' : undefined}
	data-panning={dragging ? 'true' : undefined}
	bind:this={viewportElement}
	use:canvasWheel
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
>
	{#if activeFocus !== null}
		<span class={focusChip} data-testid="canvas-focus-chip">
			<Badge size="xs" emphasis="secondary" feedback="primary">focus</Badge>
			<span class={css({ fontFamily: 'mono' })}>{activeFocus}</span>
			<span class={css({ color: 'neutral.text.muted' })}>
				{displayFiles.length - 1} related
			</span>
			<Button
				emphasis="ghost"
				size="xs"
				onclick={clearFocus}
				aria-label="Clear focus"
				data-testid="canvas-clear-focus"
			>
				Clear
			</Button>
		</span>
	{/if}
	<div class={toolbar}>
		<Button
			emphasis="secondary"
			size="xs"
			shape="square"
			onclick={() => setAllExpanded(true)}
			aria-label="Expand all diffs"
			title="Expand all diffs"
			data-testid="canvas-expand-all-button"
		>
			<Stamp emphasis="ghost" border="none" background="transparent">
				<Icon icon="lucide:chevrons-up-down" width="14px" height="14px" />
			</Stamp>
		</Button>
		<Button
			emphasis="secondary"
			size="xs"
			shape="square"
			onclick={() => setAllExpanded(false)}
			aria-label="Collapse all diffs"
			title="Collapse all diffs"
			data-testid="canvas-collapse-all-button"
		>
			<Stamp emphasis="ghost" border="none" background="transparent">
				<Icon icon="lucide:chevrons-down-up" width="14px" height="14px" />
			</Stamp>
		</Button>
		<Button
			emphasis="secondary"
			size="xs"
			shape="square"
			onclick={fit}
			aria-label="Fit canvas to view"
			title="Fit to view"
			data-testid="canvas-fit-button"
		>
			<Stamp emphasis="ghost" border="none" background="transparent">
				<Icon icon="lucide:maximize" width="14px" height="14px" />
			</Stamp>
		</Button>
	</div>

	<!-- Three nested layers, ONE inline-style writer each: the transform
	     (imperative, per gesture frame), the crisp baked zoom (imperative,
	     on gesture settle), and the board size (reactive). Sharing a node
	     between writers would let one wipe the other (see applyTransform). -->
	<div class={transformLayer} data-testid="diff-canvas-content" bind:this={contentElement}>
		<div data-testid="diff-canvas-zoom" bind:this={zoomElement}>
			<div
				class={board}
				style={`width: ${layout.width}px; height: ${layout.height}px;`}
				data-testid="diff-canvas-board"
			>
				<EdgeLayer {layout} edges={structure?.edges ?? []} {hoveredPath} />
				{#each layout.nodes as node (node.path)}
					{@const file = filesByPath.get(node.path)}
					{#if file}
						<FileNode
							{file}
							{node}
							structure={structureIndex.get(node.path)}
							expanded={isExpanded(node.path)}
							{repositoryPath}
							{branchName}
							{commitSha}
							{diffLayout}
							{diffVariant}
							{diffGutter}
							{diffWrap}
							renderDiff={shouldRenderDiff(node)}
							reviewed={isReviewed?.(node.path) ?? false}
							{onToggleReviewed}
							onHover={(path) => (hoveredPath = path)}
							onToggle={toggleDiff}
							onFocus={focusFile}
							onOpenInList={onOpenFile}
						/>
					{/if}
				{/each}
			</div>
		</div>
	</div>

	{#if !hasEdges}
		<span class={emptyHint} data-testid="canvas-no-edges-hint">
			No import relationships detected between changed files.
		</span>
	{/if}
</div>
