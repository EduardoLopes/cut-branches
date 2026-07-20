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
	changedFiles = { isLoading: false, isError: false, error: null, data: output() }
}: {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	repository?: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	changedFiles?: any;
} = {}) {
	h.repositoryQuery = repository;
	h.changedFilesQuery = changedFiles;
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
});
