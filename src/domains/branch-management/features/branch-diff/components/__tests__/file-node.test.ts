import { describe, expect, it, vi } from 'vitest';
import type { CanvasNode } from '../../models/canvas-layout';
import type { FileStructureInfo } from '../../models/structure-index';
import FileNode from '../file-node.svelte';
import type { ChangedFile, ChangedSymbol } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

vi.mock(
	'$domains/branch-management/features/branch-diff/infrastructure/queries/create-get-file-diff-query',
	() => ({
		createGetFileDiffQuery: vi.fn(() => ({
			isLoading: false,
			isError: false,
			error: null,
			data: {
				path: 'src/app.ts',
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

const file = (overrides: Partial<ChangedFile> = {}): ChangedFile => ({
	path: 'src/app.ts',
	oldPath: null,
	status: 'modified',
	linesAdded: 12,
	linesRemoved: 3,
	isBinary: false,
	...overrides
});

const node: CanvasNode = { path: 'src/app.ts', x: 40, y: 80, width: 280, height: 130, column: 0 };

const symbol = (name: string, overrides: Partial<ChangedSymbol> = {}): ChangedSymbol => ({
	name,
	kind: 'function',
	startLine: 1,
	endLine: 2,
	...overrides
});

const structure = (overrides: Partial<FileStructureInfo> = {}): FileStructureInfo => ({
	symbols: [],
	importsChanged: 0,
	importedByChanged: 0,
	...overrides
});

const defaultProps = {
	file: file(),
	node,
	repositoryPath: '/repo',
	branchName: 'feature/x',
	onToggle: vi.fn(),
	onFocus: vi.fn(),
	onOpenInList: vi.fn()
};

describe('FileNode', () => {
	it('renders identity, stats, and layout position', async () => {
		const { getByText, container } = await renderWithTestWrapper(FileNode, defaultProps);

		await expect.element(getByText('modified')).toBeInTheDocument();
		await expect.element(getByText('+12')).toBeInTheDocument();
		await expect.element(getByText('−3')).toBeInTheDocument();
		const panel = container.querySelector('[data-testid="canvas-file-node"]') as HTMLElement;
		expect(panel.style.left).toBe('40px');
		expect(panel.style.top).toBe('80px');
		expect(panel.style.width).toBe('280px');
		// Collapsed: no diff mounted.
		expect(container.querySelector('[data-testid="canvas-node-diff"]')).toBeNull();
	});

	it('shows a binary badge instead of line stats for binary files', async () => {
		const { getByText, container } = await renderWithTestWrapper(FileNode, {
			...defaultProps,
			file: file({ isBinary: true })
		});

		await expect.element(getByText('binary')).toBeInTheDocument();
		expect(container.textContent).not.toContain('+12');
	});

	it('lists changed symbols up to the limit with a +more suffix', async () => {
		const symbols = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((name) => symbol(name));
		const { getByText, container } = await renderWithTestWrapper(FileNode, {
			...defaultProps,
			structure: structure({ symbols })
		});

		await expect.element(getByText('+2 more')).toBeInTheDocument();
		expect(container.querySelectorAll('[data-testid="canvas-node-symbol"]')).toHaveLength(5);
	});

	it('shows impact counts only when non-zero', async () => {
		const { container } = await renderWithTestWrapper(FileNode, {
			...defaultProps,
			structure: structure({ importsChanged: 2, importedByChanged: 0 })
		});

		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="canvas-node-imports"]')?.textContent).toContain(
				'2'
			);
		});
		expect(container.querySelector('[data-testid="canvas-node-imported-by"]')).toBeNull();
	});

	it('reports toggle clicks, list-open clicks, and hover transitions', async () => {
		const onToggle = vi.fn();
		const onOpenInList = vi.fn();
		const onHover = vi.fn();
		const { container } = await renderWithTestWrapper(FileNode, {
			...defaultProps,
			onHover,
			onToggle,
			onOpenInList
		});

		const panel = container.querySelector('[data-canvas-node="src/app.ts"]') as HTMLElement;
		panel.dispatchEvent(new MouseEvent('mouseenter'));
		expect(onHover).toHaveBeenCalledWith('src/app.ts');
		panel.dispatchEvent(new MouseEvent('mouseleave'));
		expect(onHover).toHaveBeenCalledWith(null);

		(container.querySelector('[data-testid="canvas-node-toggle"]') as HTMLElement).click();
		expect(onToggle).toHaveBeenCalledWith('src/app.ts');
		expect(onOpenInList).not.toHaveBeenCalled();

		(container.querySelector('[data-testid="canvas-node-open-in-list"]') as HTMLElement).click();
		expect(onOpenInList).toHaveBeenCalledWith('src/app.ts');
	});

	it('reports focus requests', async () => {
		const onFocus = vi.fn();
		const { container } = await renderWithTestWrapper(FileNode, { ...defaultProps, onFocus });
		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="canvas-node-focus"]')).not.toBeNull();
		});

		(container.querySelector('[data-testid="canvas-node-focus"]') as HTMLElement).click();
		expect(onFocus).toHaveBeenCalledWith('src/app.ts');
	});

	it('embeds the file diff panel while expanded', async () => {
		// The layout hands expanded nodes a bigger slot; geometry follows it.
		const expandedNode = { ...node, width: 640, height: 490 };
		const { container, getByText } = await renderWithTestWrapper(FileNode, {
			...defaultProps,
			node: expandedNode,
			expanded: true,
			renderDiff: true
		});

		await expect.element(getByText('const x = 1')).toBeInTheDocument();
		const panel = container.querySelector('[data-testid="canvas-file-node"]') as HTMLElement;
		expect(panel.dataset.expanded).toBe('true');
		expect(panel.style.width).toBe('640px');
		expect(panel.style.height).toBe('490px');
		expect(container.querySelector('[data-canvas-diff]')).not.toBeNull();
		const toggle = container.querySelector('[data-testid="canvas-node-toggle"]');
		expect(toggle?.getAttribute('aria-expanded')).toBe('true');
	});
	it('pluralizes impact titles correctly on both sides', async () => {
		const { container } = await renderWithTestWrapper(FileNode, {
			...defaultProps,
			structure: structure({ importsChanged: 1, importedByChanged: 2 })
		});

		await vi.waitFor(() => {
			expect(
				container.querySelector('[data-testid="canvas-node-imports"]')?.getAttribute('title')
			).toBe('Imports 1 changed file');
		});
		expect(
			container.querySelector('[data-testid="canvas-node-imported-by"]')?.getAttribute('title')
		).toBe('Imported by 2 changed files');
	});

	it('reserves a placeholder while expanded but not yet near the viewport', async () => {
		const { container } = await renderWithTestWrapper(FileNode, {
			...defaultProps,
			node: { ...node, width: 640, height: 490 },
			expanded: true,
			renderDiff: false
		});

		await vi.waitFor(() => {
			expect(
				container.querySelector('[data-testid="canvas-node-diff-placeholder"]')
			).not.toBeNull();
		});
		expect(container.querySelector('[data-testid="canvas-node-diff"]')).toBeNull();
	});

	it('reports reviewed toggle clicks when not yet reviewed', async () => {
		const onToggleReviewed = vi.fn();
		const { container } = await renderWithTestWrapper(FileNode, {
			...defaultProps,
			reviewed: false,
			onToggleReviewed
		});

		const button = container.querySelector(
			'[data-testid="canvas-node-reviewed"]'
		) as HTMLButtonElement;
		const panel = container.querySelector('[data-testid="canvas-file-node"]') as HTMLElement;
		expect(button.getAttribute('aria-pressed')).toBe('false');
		expect(panel.dataset.reviewed).toBeUndefined();

		button.click();
		expect(onToggleReviewed).toHaveBeenCalledWith('src/app.ts');
	});

	it('marks the panel reviewed when the flag is set', async () => {
		const { container } = await renderWithTestWrapper(FileNode, {
			...defaultProps,
			reviewed: true,
			onToggleReviewed: vi.fn()
		});

		const button = container.querySelector(
			'[data-testid="canvas-node-reviewed"]'
		) as HTMLButtonElement;
		expect(button.getAttribute('aria-pressed')).toBe('true');
		expect(
			(container.querySelector('[data-testid="canvas-file-node"]') as HTMLElement).dataset.reviewed
		).toBe('true');
	});

	it('does not throw when the reviewed toggle has no handler', async () => {
		const { container } = await renderWithTestWrapper(FileNode, {
			...defaultProps,
			reviewed: false
		});
		const button = container.querySelector(
			'[data-testid="canvas-node-reviewed"]'
		) as HTMLButtonElement;
		expect(() => button.click()).not.toThrow();
	});

	it('threads explicit diff options into the expanded panel', async () => {
		const { container, getByText } = await renderWithTestWrapper(FileNode, {
			...defaultProps,
			node: { ...node, width: 640, height: 490 },
			expanded: true,
			renderDiff: true,
			commitSha: 'abc1234',
			branchName: null,
			diffLayout: 'split' as const,
			diffVariant: 'markers' as const,
			diffGutter: 'double' as const,
			diffWrap: true
		});

		await expect.element(getByText('const x = 1')).toBeInTheDocument();
		expect(container.querySelector('[data-canvas-diff]')).not.toBeNull();
	});

	it('expands a collapsed node when Explain is clicked', async () => {
		const onToggle = vi.fn();
		const { getByTestId } = await renderWithTestWrapper(FileNode, { ...defaultProps, onToggle });
		await getByTestId('canvas-node-explain').click();
		expect(onToggle).toHaveBeenCalledWith('src/app.ts');
	});

	it('shows the explanation panel inside the diff area when opened', async () => {
		const { getByTestId, container } = await renderWithTestWrapper(FileNode, {
			...defaultProps,
			node: { ...node, width: 640, height: 490 },
			expanded: true,
			renderDiff: true
		});
		expect(container.querySelector('[data-testid="explanation-panel"]')).toBeNull();
		await getByTestId('canvas-node-explain').click();
		await expect.element(getByTestId('explanation-panel')).toBeInTheDocument();
	});

	it('hides the Explain affordance for binary files', async () => {
		const { container } = await renderWithTestWrapper(FileNode, {
			...defaultProps,
			file: file({ isBinary: true })
		});
		expect(container.querySelector('[data-testid="canvas-node-explain"]')).toBeNull();
	});

	it('opens the explanation panel in per-change mode', async () => {
		const { getByTestId } = await renderWithTestWrapper(FileNode, {
			...defaultProps,
			node: { ...node, width: 640, height: 490 },
			expanded: true,
			renderDiff: true,
			explanationDetail: 'hunks'
		});
		await getByTestId('canvas-node-explain').click();
		await expect.element(getByTestId('explanation-panel')).toBeInTheDocument();
	});
});
