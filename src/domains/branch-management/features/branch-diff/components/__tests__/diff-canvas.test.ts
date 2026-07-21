import { describe, expect, it, vi } from 'vitest';
import DiffCanvas from '../diff-canvas.svelte';
import type { ChangedFile, GetDiffStructureOutput } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

vi.mock(
	'$domains/branch-management/features/branch-diff/infrastructure/queries/create-get-file-diff-query',
	() => ({
		createGetFileDiffQuery: vi.fn(() => ({
			isLoading: false,
			isError: false,
			error: null,
			data: {
				path: 'src/a.ts',
				oldPath: null,
				status: 'modified',
				isBinary: false,
				truncated: false,
				hunks: [
					{
						header: '@@ -1 +1 @@',
						oldStart: 1,
						oldLines: 1,
						newStart: 1,
						newLines: 1,
						lines: [{ kind: 'added', content: 'const x = 1', oldLineNo: null, newLineNo: 1 }]
					}
				]
			}
		}))
	})
);
vi.mock('$ui/patterns/diff-viewer/highlighter', () => ({
	highlightDiffCode: vi.fn(async () => null)
}));

const file = (path: string, overrides: Partial<ChangedFile> = {}): ChangedFile => ({
	path,
	oldPath: null,
	status: 'modified',
	linesAdded: 1,
	linesRemoved: 1,
	isBinary: false,
	...overrides
});

const structure = (overrides: Partial<GetDiffStructureOutput> = {}): GetDiffStructureOutput => ({
	files: [
		{
			path: 'src/a.ts',
			language: 'typescript',
			parsed: true,
			changedSymbols: [{ name: 'alpha', kind: 'function', startLine: 1, endLine: 3 }],
			imports: []
		},
		{
			path: 'src/b.ts',
			language: 'typescript',
			parsed: true,
			changedSymbols: [],
			imports: [{ specifier: './a', resolvedPath: 'src/a.ts' }]
		}
	],
	edges: [{ from: 'src/b.ts', to: 'src/a.ts', kind: 'import', symbols: [] }],
	...overrides
});

const defaultProps = {
	files: [file('src/a.ts'), file('src/b.ts')],
	structure: structure(),
	repositoryPath: '/repo',
	branchName: 'feature/x',
	onOpenFile: vi.fn()
};

function transformOf(container: Element): string {
	return (
		(container.querySelector('[data-testid="diff-canvas-content"]') as HTMLElement).style
			.transform ?? ''
	);
}

function wheel(target: Element, init: WheelEventInit): void {
	target.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init }));
}

describe('DiffCanvas', () => {
	it('renders one node per file, edges, and every diff expanded by default', async () => {
		const { container } = renderWithTestWrapper(DiffCanvas, defaultProps);

		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="canvas-file-node"]')).toHaveLength(2);
		});
		const edges = container.querySelectorAll('[data-testid="diff-canvas-edge"]');
		expect(edges).toHaveLength(1);
		expect(edges[0].getAttribute('data-from')).toBe('src/b.ts');
		// The trace ends in an arrowhead at the imported file; this import-only
		// edge uses the muted marker.
		expect(edges[0].getAttribute('marker-end')).toBe('url(#edge-arrow-muted)');
		expect(container.querySelector('marker#edge-arrow-muted')).not.toBeNull();
		expect(container.querySelector('[data-testid="canvas-no-edges-hint"]')).toBeNull();
		// Small changesets open every diff up front.
		expect(container.querySelectorAll('[data-canvas-diff]')).toHaveLength(2);
	});

	it('starts collapsed past the auto-expand cap; expand-all mounts only near-viewport diffs', async () => {
		const many = Array.from({ length: 31 }, (_, i) => file(`src/f${i}.ts`));
		const { container } = renderWithTestWrapper(DiffCanvas, {
			...defaultProps,
			files: many,
			structure: undefined
		});

		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="canvas-file-node"]')).toHaveLength(31);
		});
		expect(container.querySelectorAll('[data-canvas-diff]')).toHaveLength(0);

		(container.querySelector('[data-testid="canvas-expand-all-button"]') as HTMLElement).click();
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-canvas-diff]').length).toBeGreaterThan(0);
		});
		// Every node is EXPANDED (slot reserved)…
		expect(container.querySelectorAll('[data-canvas-node] [aria-expanded="true"]')).toHaveLength(
			31
		);
		// …but only the ones near the viewport actually MOUNT their diff; far
		// nodes hold a placeholder until panned into range.
		const mounted = container.querySelectorAll('[data-canvas-diff]').length;
		const placeholders = container.querySelectorAll(
			'[data-testid="canvas-node-diff-placeholder"]'
		).length;
		expect(mounted).toBeLessThan(31);
		expect(mounted + placeholders).toBe(31);
	});

	it('mounts more diffs after panning toward them', async () => {
		const many = Array.from({ length: 31 }, (_, i) => file(`src/f${i}.ts`));
		const { container } = renderWithTestWrapper(DiffCanvas, {
			...defaultProps,
			files: many,
			structure: undefined
		});
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="canvas-file-node"]')).toHaveLength(31);
		});
		(container.querySelector('[data-testid="canvas-expand-all-button"]') as HTMLElement).click();
		let before = 0;
		await vi.waitFor(() => {
			before = container.querySelectorAll('[data-canvas-diff]').length;
			expect(before).toBeGreaterThan(0);
		});

		// Pan far down; after the view-rect debounce, deeper rows mount.
		const viewport = container.querySelector('[data-testid="diff-canvas"]') as HTMLElement;
		wheel(viewport, { deltaY: 3000 });
		await vi.waitFor(
			() => {
				expect(container.querySelectorAll('[data-canvas-diff]').length).toBeGreaterThan(before);
			},
			{ timeout: 3000 }
		);
	});

	it('pans with the wheel and zooms with ctrl+wheel', async () => {
		const { container } = renderWithTestWrapper(DiffCanvas, defaultProps);
		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="diff-canvas"]')).not.toBeNull();
		});
		const viewport = container.querySelector('[data-testid="diff-canvas"]') as HTMLElement;

		wheel(viewport, { deltaX: 10, deltaY: 30 });
		expect(transformOf(container)).toBe('translate(-10px, -30px) scale(1)');

		wheel(viewport, { deltaY: -50, ctrlKey: true, clientX: 0, clientY: 0 });
		expect(transformOf(container)).toContain('scale(1.64872');
	});

	it('keeps the pan/zoom view when a diff toggle resizes the board', async () => {
		const { container } = renderWithTestWrapper(DiffCanvas, defaultProps);
		await vi.waitFor(() => {
			expect(container.querySelector('[data-canvas-diff]')).not.toBeNull();
		});
		const viewport = container.querySelector('[data-testid="diff-canvas"]') as HTMLElement;
		const zoomLayer = container.querySelector('[data-testid="diff-canvas-zoom"]') as HTMLElement;

		wheel(viewport, { deltaY: 30 });
		wheel(viewport, { deltaY: -20, ctrlKey: true });
		// Let the gesture settle: the zoom bakes into the crisp layer and the
		// transform keeps only the pan.
		await vi.waitFor(() => {
			expect(zoomLayer.style.getPropertyValue('zoom')).not.toBe('');
		});
		const transform = transformOf(container);
		const baked = zoomLayer.style.getPropertyValue('zoom');
		expect(transform).toContain('scale(1)');

		// Collapsing a node rewrites the board's size style — the transform
		// and baked zoom (separate elements) must survive it.
		(
			container.querySelector(
				'[data-canvas-node="src/a.ts"] [data-testid="canvas-node-toggle"]'
			) as HTMLElement
		).click();
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-canvas-diff]')).toHaveLength(1);
		});
		expect(transformOf(container)).toBe(transform);
		expect(zoomLayer.style.getPropertyValue('zoom')).toBe(baked);

		// Same for expand/collapse-all.
		(container.querySelector('[data-testid="canvas-collapse-all-button"]') as HTMLElement).click();
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-canvas-diff]')).toHaveLength(0);
		});
		expect(transformOf(container)).toBe(transform);
		expect(zoomLayer.style.getPropertyValue('zoom')).toBe(baked);
	});

	it('bakes a settled zoom into the crisp zoom property', async () => {
		const { container } = renderWithTestWrapper(DiffCanvas, defaultProps);
		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="diff-canvas"]')).not.toBeNull();
		});
		const viewport = container.querySelector('[data-testid="diff-canvas"]') as HTMLElement;
		const zoomLayer = container.querySelector('[data-testid="diff-canvas-zoom"]') as HTMLElement;

		// Mid-gesture: the cheap composited scale carries the zoom…
		wheel(viewport, { deltaY: -50, ctrlKey: true, clientX: 0, clientY: 0 });
		expect(transformOf(container)).toContain('scale(1.64872');
		expect(zoomLayer.style.getPropertyValue('zoom')).toBe('');

		// …after settling, the zoom property owns it and the scale resets, so
		// text re-renders at native sharpness instead of stretching a raster.
		await vi.waitFor(() => {
			expect(zoomLayer.style.getPropertyValue('zoom')).toContain('1.64872');
		});
		expect(transformOf(container)).toContain('scale(1)');
	});

	it('clamps the zoom range', async () => {
		const { container } = renderWithTestWrapper(DiffCanvas, defaultProps);
		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="diff-canvas"]')).not.toBeNull();
		});
		const viewport = container.querySelector('[data-testid="diff-canvas"]') as HTMLElement;

		wheel(viewport, { deltaY: 10_000, ctrlKey: true });
		expect(transformOf(container)).toContain('scale(0.25)');
		wheel(viewport, { deltaY: -100_000, metaKey: true });
		expect(transformOf(container)).toContain('scale(2)');
	});

	it('never pans from a plain drag — panning by drag is the hand tool alone', async () => {
		const { container } = renderWithTestWrapper(DiffCanvas, defaultProps);
		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="diff-canvas"]')).not.toBeNull();
		});
		const viewport = container.querySelector('[data-testid="diff-canvas"]') as HTMLElement;

		// Background drag without space: nothing moves.
		viewport.dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, clientX: 500, clientY: 500, pointerId: 1 })
		);
		viewport.dispatchEvent(
			new PointerEvent('pointermove', { bubbles: true, clientX: 520, clientY: 490, pointerId: 1 })
		);
		viewport.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
		expect(transformOf(container)).toBe('');

		// Same for drags starting on nodes and toolbar buttons.
		const node = container.querySelector('[data-testid="canvas-file-node"]') as HTMLElement;
		node.dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0, pointerId: 2 })
		);
		viewport.dispatchEvent(
			new PointerEvent('pointermove', { bubbles: true, clientX: 40, clientY: 40, pointerId: 2 })
		);
		viewport.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 2 }));
		const fitButton = container.querySelector('[data-testid="canvas-fit-button"]') as HTMLElement;
		fitButton.dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0, pointerId: 3 })
		);
		viewport.dispatchEvent(
			new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 60, pointerId: 3 })
		);
		viewport.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 3 }));
		expect(transformOf(container)).toBe('');
	});

	it('fits the whole board into the viewport via the fit button', async () => {
		const { container } = renderWithTestWrapper(DiffCanvas, defaultProps);
		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="diff-canvas"]')).not.toBeNull();
		});

		// DOM-level click: the headless viewport has no height, so Playwright's
		// hit-testing would report the button as clipped.
		(container.querySelector('[data-testid="canvas-fit-button"]') as HTMLElement).click();
		const transform = transformOf(container);
		expect(transform).toContain('translate(');
		expect(transform).toContain('scale(');
	});

	it('toggles individual diffs and collapses everything via the toolbar', async () => {
		const { container } = renderWithTestWrapper(DiffCanvas, defaultProps);
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-canvas-diff]')).toHaveLength(2);
		});
		const toggleOf = (path: string) =>
			container.querySelector(
				`[data-canvas-node="${path}"] [data-testid="canvas-node-toggle"]`
			) as HTMLElement;

		// Collapse one node; the other stays open.
		toggleOf('src/a.ts').click();
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-canvas-diff]')).toHaveLength(1);
			expect(
				container.querySelector('[data-canvas-node="src/a.ts"][data-expanded="true"]')
			).toBeNull();
		});

		// Re-expand it.
		toggleOf('src/a.ts').click();
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-canvas-diff]')).toHaveLength(2);
		});

		// Collapse all, then expand all — overrides reset both times.
		(container.querySelector('[data-testid="canvas-collapse-all-button"]') as HTMLElement).click();
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-canvas-diff]')).toHaveLength(0);
		});
		(container.querySelector('[data-testid="canvas-expand-all-button"]') as HTMLElement).click();
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-canvas-diff]')).toHaveLength(2);
		});
	});

	it('hands off to the list via the node open-in-list button', async () => {
		const onOpenFile = vi.fn();
		const { container } = renderWithTestWrapper(DiffCanvas, {
			...defaultProps,
			onOpenFile
		});
		await vi.waitFor(() => {
			expect(container.querySelector('[data-canvas-node="src/a.ts"]')).not.toBeNull();
		});

		(
			container.querySelector(
				'[data-canvas-node="src/a.ts"] [data-testid="canvas-node-open-in-list"]'
			) as HTMLElement
		).click();
		expect(onOpenFile).toHaveBeenCalledWith('src/a.ts');
	});

	it('leaves plain wheel over a diff to the diff, but still zooms with ctrl', async () => {
		const { container } = renderWithTestWrapper(DiffCanvas, defaultProps);
		await vi.waitFor(() => {
			expect(container.querySelector('[data-canvas-diff]')).not.toBeNull();
		});
		const diffArea = container.querySelector('[data-canvas-diff]') as Element;

		// Plain scrolling belongs to the diff's own scroller.
		const before = transformOf(container);
		wheel(diffArea, { deltaY: 40 });
		expect(transformOf(container)).toBe(before);

		// Zoom gestures always reach the canvas — even over diff content.
		wheel(diffArea, { deltaY: -50, ctrlKey: true, clientX: 0, clientY: 0 });
		expect(transformOf(container)).toContain('scale(1.64872');
	});

	it('focuses a file down to its import neighborhood and clears again', async () => {
		// c.css is unrelated — focusing a.ts must hide it.
		const files = [file('src/a.ts'), file('src/b.ts'), file('c.css')];
		const { container, getByText } = renderWithTestWrapper(DiffCanvas, {
			...defaultProps,
			files
		});
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="canvas-file-node"]')).toHaveLength(3);
		});

		(
			container.querySelector(
				'[data-canvas-node="src/a.ts"] [data-testid="canvas-node-focus"]'
			) as HTMLElement
		).click();

		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="canvas-file-node"]')).toHaveLength(2);
		});
		expect(container.querySelector('[data-canvas-node="c.css"]')).toBeNull();
		await expect.element(getByText('1 related')).toBeInTheDocument();

		(container.querySelector('[data-testid="canvas-clear-focus"]') as HTMLElement).click();
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="canvas-file-node"]')).toHaveLength(3);
		});
		expect(container.querySelector('[data-testid="canvas-focus-chip"]')).toBeNull();
	});

	it('clears the focus with Escape', async () => {
		const { container } = renderWithTestWrapper(DiffCanvas, defaultProps);
		await vi.waitFor(() => {
			expect(container.querySelector('[data-canvas-node="src/a.ts"]')).not.toBeNull();
		});

		(
			container.querySelector(
				'[data-canvas-node="src/a.ts"] [data-testid="canvas-node-focus"]'
			) as HTMLElement
		).click();
		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="canvas-focus-chip"]')).not.toBeNull();
		});

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="canvas-focus-chip"]')).toBeNull();
		});
	});

	it('focusing an unconnected file shows only that file', async () => {
		const files = [file('src/a.ts'), file('src/b.ts'), file('c.css')];
		const { container } = renderWithTestWrapper(DiffCanvas, { ...defaultProps, files });
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="canvas-file-node"]')).toHaveLength(3);
		});

		(
			container.querySelector(
				'[data-canvas-node="c.css"] [data-testid="canvas-node-focus"]'
			) as HTMLElement
		).click();
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="canvas-file-node"]')).toHaveLength(1);
		});
		expect(container.querySelector('[data-canvas-node="c.css"]')).not.toBeNull();
	});

	it('highlights a hovered node’s edges', async () => {
		const { container } = renderWithTestWrapper(DiffCanvas, defaultProps);
		await vi.waitFor(() => {
			expect(container.querySelector('[data-canvas-node="src/a.ts"]')).not.toBeNull();
		});

		(container.querySelector('[data-canvas-node="src/a.ts"]') as HTMLElement).dispatchEvent(
			new MouseEvent('mouseenter')
		);
		await vi.waitFor(() => {
			expect(
				container
					.querySelector('[data-testid="diff-canvas-edge"]')
					?.getAttribute('data-highlighted')
			).toBe('true');
		});
	});

	it('pans from anywhere with the space hand tool, even over nodes', async () => {
		const { container } = renderWithTestWrapper(DiffCanvas, defaultProps);
		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="canvas-file-node"]')).not.toBeNull();
		});
		const viewport = container.querySelector('[data-testid="diff-canvas"]') as HTMLElement;
		const node = container.querySelector('[data-testid="canvas-file-node"]') as HTMLElement;

		window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
		await vi.waitFor(() => {
			expect(viewport.dataset.hand).toBe('true');
		});

		node.dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10, pointerId: 5 })
		);
		viewport.dispatchEvent(
			new PointerEvent('pointermove', { bubbles: true, clientX: 40, clientY: 25, pointerId: 5 })
		);
		viewport.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 5 }));
		expect(transformOf(container)).toBe('translate(30px, 15px) scale(1)');

		window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true }));
		await vi.waitFor(() => {
			expect(viewport.dataset.hand).toBeUndefined();
		});
	});

	it('leaves the spacebar alone while typing in an editable element', async () => {
		const { container } = renderWithTestWrapper(DiffCanvas, defaultProps);
		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="diff-canvas"]')).not.toBeNull();
		});
		const viewport = container.querySelector('[data-testid="diff-canvas"]') as HTMLElement;

		const input = document.createElement('input');
		document.body.appendChild(input);
		input.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
		expect(viewport.dataset.hand).toBeUndefined();
		input.remove();
	});

	it('shows a hint when no import relationships exist', async () => {
		const { container, getByText } = renderWithTestWrapper(DiffCanvas, {
			files: [file('src/a.ts')],
			structure: structure({ edges: [] }),
			repositoryPath: '/repo',
			onOpenFile: vi.fn()
		});

		await expect
			.element(getByText('No import relationships detected between changed files.'))
			.toBeInTheDocument();
		expect(container.querySelectorAll('[data-testid="diff-canvas-edge"]')).toHaveLength(0);
	});

	it('renders nodes without any structure data at all', async () => {
		const { container } = renderWithTestWrapper(DiffCanvas, {
			files: [file('src/a.ts'), file('src/b.ts')],
			structure: undefined,
			repositoryPath: '/repo',
			onOpenFile: vi.fn()
		});

		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="canvas-file-node"]')).toHaveLength(2);
		});
	});

	it('marks reviewed nodes and relays reviewed toggles', async () => {
		const onToggleReviewed = vi.fn();
		const { container } = renderWithTestWrapper(DiffCanvas, {
			...defaultProps,
			isReviewed: (path: string) => path === 'src/a.ts',
			onToggleReviewed
		});

		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="canvas-file-node"]')).toHaveLength(2);
		});

		const reviewedNode = container.querySelector('[data-canvas-node="src/a.ts"]') as HTMLElement;
		const plainNode = container.querySelector('[data-canvas-node="src/b.ts"]') as HTMLElement;
		expect(reviewedNode.dataset.reviewed).toBe('true');
		expect(plainNode.dataset.reviewed).toBeUndefined();

		(plainNode.querySelector('[data-testid="canvas-node-reviewed"]') as HTMLElement).click();
		expect(onToggleReviewed).toHaveBeenCalledWith('src/b.ts');
	});
});
