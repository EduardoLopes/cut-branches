import { tick } from 'svelte';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BranchDiffView from '../branch-diff-view.svelte';
import type { ListChangedFilesOutput } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

const h = vi.hoisted(() => ({
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	repositoryQuery: {} as any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	changedFilesQuery: {} as any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	structureQuery: {} as any,
	goto: vi.fn()
}));

vi.mock('$domains/branch-management/infrastructure/queries/create-get-repository-query', () => ({
	createGetRepositoryQuery: vi.fn(() => h.repositoryQuery)
}));
vi.mock(
	'$domains/branch-management/features/branch-diff/infrastructure/queries/create-list-changed-files-query',
	() => ({ createListChangedFilesQuery: vi.fn(() => h.changedFilesQuery) })
);
vi.mock(
	'$domains/branch-management/features/branch-diff/infrastructure/queries/create-get-diff-structure-query',
	() => ({ createGetDiffStructureQuery: vi.fn(() => h.structureQuery) })
);
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
				hunks: []
			}
		}))
	})
);
vi.mock('$ui/patterns/diff-viewer/highlighter', () => ({
	highlightDiffCode: vi.fn(async () => null)
}));
vi.mock('$app/navigation', () => ({ goto: h.goto }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));
vi.mock('$infrastructure/tauri-commands', () => ({
	executeCommand: vi.fn(async () => ({
		path: 'src/app.ts',
		oldPath: null,
		status: 'modified',
		isBinary: false,
		truncated: false,
		hunks: []
	}))
}));

const output = (overrides: Partial<ListChangedFilesOutput> = {}): ListChangedFilesOutput => ({
	files: [
		{
			path: 'src/app.ts',
			oldPath: null,
			status: 'modified',
			linesAdded: 20,
			linesRemoved: 4,
			isBinary: false
		},
		{
			path: 'src/new.ts',
			oldPath: null,
			status: 'added',
			linesAdded: 10,
			linesRemoved: 0,
			isBinary: false
		}
	],
	linesAdded: 30,
	linesRemoved: 4,
	...overrides
});

function setQueries({
	repository = { isLoading: false, isError: false, error: null, data: { path: '/repo' } },
	changedFiles = { isLoading: false, isError: false, error: null, data: output() },
	structure = { isLoading: false, isError: false, error: null, data: undefined }
}: {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	repository?: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	changedFiles?: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	structure?: any;
} = {}) {
	h.repositoryQuery = repository;
	h.changedFilesQuery = changedFiles;
	h.structureQuery = structure;
}

beforeEach(() => {
	h.goto.mockClear();
	localStorage.clear();
	setQueries();
});

describe('BranchDiffView', () => {
	it('shows the branch target badge, totals, and one row per changed file', async () => {
		const { getByText, container } = renderWithTestWrapper(BranchDiffView, {
			id: 'repo-1',
			branchName: 'feature/x'
		});

		await expect.element(getByText('feature/x')).toBeInTheDocument();
		await expect.element(getByText('2 files')).toBeInTheDocument();
		await expect.element(getByText('+30')).toBeInTheDocument();
		const totals = container.querySelector('[data-testid="diff-totals"]');
		expect(totals?.textContent).toContain('−4');
		expect(container.querySelectorAll('[data-testid="changed-file-row"]')).toHaveLength(2);
	});

	it('shows the short sha badge for a commit target', async () => {
		const { getByText } = renderWithTestWrapper(BranchDiffView, {
			id: 'repo-1',
			commitSha: 'abc1234567890def'
		});

		await expect.element(getByText('abc1234', { exact: true })).toBeInTheDocument();
	});

	it('navigates back to the branches view', async () => {
		const { getByRole } = renderWithTestWrapper(BranchDiffView, {
			id: 'repo-1',
			branchName: 'feature/x'
		});

		await getByRole('button', { name: /Branches/ }).click();
		expect(h.goto).toHaveBeenCalledWith('/repos/repo-1');
	});

	it('shows a loading state while the changed files are computed', async () => {
		setQueries({ changedFiles: { isLoading: true, isError: false, error: null } });
		const { getByText } = renderWithTestWrapper(BranchDiffView, {
			id: 'repo-1',
			branchName: 'feature/x'
		});

		await expect.element(getByText('Computing changes…')).toBeInTheDocument();
	});

	it('surfaces changed-files errors, preferring the description', async () => {
		setQueries({
			changedFiles: {
				isLoading: false,
				isError: true,
				error: { message: 'Failed', description: 'Branch **gone** not found' }
			}
		});
		const { getByText } = renderWithTestWrapper(BranchDiffView, {
			id: 'repo-1',
			branchName: 'gone'
		});

		await expect.element(getByText('Branch **gone** not found')).toBeInTheDocument();
	});

	it('surfaces repository errors', async () => {
		setQueries({
			repository: { isLoading: false, isError: true, error: { message: 'Repo not found' } },
			changedFiles: { isLoading: false, isError: false, error: null }
		});
		const { getByText } = renderWithTestWrapper(BranchDiffView, {
			id: 'missing',
			branchName: 'feature/x'
		});

		await expect.element(getByText('Repo not found')).toBeInTheDocument();
	});

	it('shows an empty state when the diff has no files', async () => {
		setQueries({
			changedFiles: {
				isLoading: false,
				isError: false,
				error: null,
				data: output({ files: [], linesAdded: 0, linesRemoved: 0 })
			}
		});
		const { getByText } = renderWithTestWrapper(BranchDiffView, {
			id: 'repo-1',
			branchName: 'feature/x'
		});

		await expect.element(getByText(/No changes to show/)).toBeInTheDocument();
	});

	it('filters the file list by path through the search input', async () => {
		const { getByTestId, getByText, container } = renderWithTestWrapper(BranchDiffView, {
			id: 'repo-1',
			branchName: 'feature/x'
		});

		const input = getByTestId('diff-search-input');
		await input.fill('new.ts');

		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="changed-file-row"]')).toHaveLength(1);
		});

		await input.fill('no-such-file-anywhere');
		await vi.waitFor(() => {
			expect(container.querySelectorAll('[data-testid="changed-file-row"]')).toHaveLength(0);
		});
		await expect.element(getByText(/No files or code match/)).toBeInTheDocument();
	});

	it('shows the view options menu when there are changed files', async () => {
		const { getByTestId } = renderWithTestWrapper(BranchDiffView, {
			id: 'repo-1',
			branchName: 'feature/x'
		});

		await expect.element(getByTestId('diff-options-trigger')).toBeInTheDocument();
	});

	it('hides the view options menu when the diff has no files', async () => {
		setQueries({
			changedFiles: {
				isLoading: false,
				isError: false,
				error: null,
				data: output({ files: [], linesAdded: 0, linesRemoved: 0 })
			}
		});
		const { getByText, container } = renderWithTestWrapper(BranchDiffView, {
			id: 'repo-1',
			branchName: 'feature/x'
		});

		await expect.element(getByText(/No changes to show/)).toBeInTheDocument();
		expect(container.querySelector('[data-testid="diff-options-trigger"]')).toBeNull();
	});

	it('persists menu changes into the shared view options', async () => {
		const screen = renderWithTestWrapper(BranchDiffView, {
			id: 'repo-1',
			branchName: 'feature/x'
		});

		await screen.getByTestId('diff-options-trigger').click();
		await tick();
		await screen.getByRole('menuitemradio', { name: 'Split' }).click();

		await vi.waitFor(() => {
			const stored = JSON.parse(localStorage.getItem('diff-view-options') ?? '{}');
			expect(stored.layout).toBe('split');
		});
	});

	it('shows the file tree pane when more than one file changed', async () => {
		const { getByTestId } = renderWithTestWrapper(BranchDiffView, {
			id: 'repo-1',
			branchName: 'feature/x'
		});

		await expect.element(getByTestId('diff-tree-pane')).toBeInTheDocument();
	});

	it('hides the file tree pane for a single-file diff', async () => {
		setQueries({
			changedFiles: {
				isLoading: false,
				isError: false,
				error: null,
				data: output({ files: [output().files[0]], linesAdded: 20, linesRemoved: 4 })
			}
		});
		const { getByText, container } = renderWithTestWrapper(BranchDiffView, {
			id: 'repo-1',
			branchName: 'feature/x'
		});

		await expect.element(getByText('1 file', { exact: true })).toBeInTheDocument();
		expect(container.querySelector('[data-testid="diff-tree-pane"]')).toBeNull();
	});

	it('scrolls to and opens a file row when its tree node is activated', async () => {
		const scrollIntoView = vi
			.spyOn(Element.prototype, 'scrollIntoView')
			.mockImplementation(() => {});
		const { getByText, container } = renderWithTestWrapper(BranchDiffView, {
			id: 'repo-1',
			branchName: 'feature/x'
		});

		await getByText('new.ts', { exact: true }).click();

		await vi.waitFor(() => {
			const row = container.querySelector('[data-file-path="src/new.ts"]');
			expect(row?.querySelector('[data-testid="file-diff-panel"]')).not.toBeNull();
		});
		expect(scrollIntoView).toHaveBeenCalled();
		scrollIntoView.mockRestore();
	});

	it('auto-expands the diff when there is exactly one changed file', async () => {
		setQueries({
			changedFiles: {
				isLoading: false,
				isError: false,
				error: null,
				data: output({ files: [output().files[0]], linesAdded: 20, linesRemoved: 4 })
			}
		});
		const { container } = renderWithTestWrapper(BranchDiffView, {
			id: 'repo-1',
			branchName: 'feature/x'
		});

		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="file-diff-panel"]')).not.toBeNull();
		});
	});
	it('threads the structure analysis into the rows as impact badges', async () => {
		setQueries({
			structure: {
				isLoading: false,
				isError: false,
				error: null,
				data: {
					files: [
						{
							path: 'src/app.ts',
							language: 'typescript',
							parsed: true,
							changedSymbols: [{ name: 'boot', kind: 'function', startLine: 1, endLine: 4 }],
							imports: [{ specifier: './new', resolvedPath: 'src/new.ts' }]
						},
						{
							path: 'src/new.ts',
							language: 'typescript',
							parsed: true,
							changedSymbols: [],
							imports: []
						}
					],
					edges: [{ from: 'src/app.ts', to: 'src/new.ts', kind: 'import' }]
				}
			}
		});
		const { container, getByText } = renderWithTestWrapper(BranchDiffView, {
			id: 'repo-1',
			branchName: 'feature/x'
		});
		await tick();

		await expect.element(getByText('ƒ boot')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="changed-file-imports"]')?.textContent).toContain(
			'1'
		);
		expect(
			container.querySelector('[data-testid="changed-file-imported-by"]')?.textContent
		).toContain('1');
	});
	it('switches to the canvas mode and back, persisting the choice', async () => {
		setQueries({
			structure: { isLoading: false, isError: false, error: null, data: { files: [], edges: [] } }
		});
		const { container, getByText } = renderWithTestWrapper(BranchDiffView, {
			id: 'repo-1',
			branchName: 'feature/x'
		});
		await tick();

		expect(container.querySelector('[data-testid="diff-canvas"]')).toBeNull();
		// The Choice's radio input is visually hidden — click its label.
		await getByText('Canvas').click();

		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="diff-canvas"]')).not.toBeNull();
		});
		// The list body is gone while the canvas is active…
		expect(container.querySelector('[data-testid="changed-files-list"]')).toBeNull();
		// …and the choice is persisted for the next session.
		expect(localStorage.getItem('diff-view-options')).toContain('"viewMode":"canvas"');
	});

	it('shows the analysis loading and error states in canvas mode', async () => {
		localStorage.setItem(
			'diff-view-options',
			JSON.stringify({
				layout: 'unified',
				variant: 'background',
				gutter: 'single',
				wrap: false,
				viewMode: 'canvas'
			})
		);
		setQueries({ structure: { isLoading: true, isError: false, error: null, data: undefined } });
		const first = renderWithTestWrapper(BranchDiffView, { id: 'repo-1', branchName: 'feature/x' });
		await expect.element(first.getByText('Analyzing code structure…')).toBeInTheDocument();
		first.unmount();

		setQueries({
			structure: {
				isLoading: false,
				isError: true,
				error: { message: 'Failed', description: 'Analysis blew up' },
				data: undefined
			}
		});
		const second = renderWithTestWrapper(BranchDiffView, { id: 'repo-1', branchName: 'feature/x' });
		await expect.element(second.getByText('Analysis blew up')).toBeInTheDocument();
	});

	it('returns to the list and reveals the file when a canvas node is activated', async () => {
		localStorage.setItem(
			'diff-view-options',
			JSON.stringify({
				layout: 'unified',
				variant: 'background',
				gutter: 'single',
				wrap: false,
				viewMode: 'canvas'
			})
		);
		setQueries({
			structure: { isLoading: false, isError: false, error: null, data: { files: [], edges: [] } }
		});
		const { container } = renderWithTestWrapper(BranchDiffView, {
			id: 'repo-1',
			branchName: 'feature/x'
		});
		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="diff-canvas"]')).not.toBeNull();
		});

		(
			container.querySelector(
				'[data-canvas-node="src/app.ts"] [data-testid="canvas-node-open-in-list"]'
			) as HTMLElement
		).click();

		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="changed-files-list"]')).not.toBeNull();
		});
		// The reveal signal opened the file's diff panel in the list.
		await vi.waitFor(() => {
			expect(container.querySelector('[data-testid="file-diff-panel"]')).not.toBeNull();
		});
	});
});
