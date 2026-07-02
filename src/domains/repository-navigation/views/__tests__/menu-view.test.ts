import { createRawSnippet, tick } from 'svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MenuView from '../menu-view.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const repositoryListAction = createRawSnippet(() => ({
	render: () => '<button type="button">Add a git repository</button>'
}));

// Mock Tauri commands
vi.mock('$infrastructure/bindings', () => ({
	commands: {
		getRepositoryList: vi.fn(() =>
			Promise.resolve({
				status: 'ok',
				data: [
					{
						id: '1',
						name: 'repo1',
						path: '/path/repo1',
						currentBranch: 'main',
						branchesCount: 5,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					},
					{
						id: '2',
						name: 'repo2',
						path: '/path/repo2',
						currentBranch: 'main',
						branchesCount: 3,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					},
					{
						id: '3',
						name: 'repo3',
						path: '/path/repo3',
						currentBranch: 'main',
						branchesCount: 0,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					}
				]
			})
		)
	}
}));

// Define the mock for $app/state
vi.mock('$app/state', () => ({
	page: {
		params: { id: '1' }
	}
}));

describe('MenuView Component', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('renders all repositories in the list', async () => {
		const screen = renderWithTestWrapper(MenuView, { repositoryListAction });

		await tick();
		await tick();

		expect(screen.getByText('repo1')).toBeInTheDocument();
		expect(screen.getByText('repo2')).toBeInTheDocument();
		expect(screen.getByText('repo3')).toBeInTheDocument();
	});

	it('displays badge counts for repositories with branches', async () => {
		const screen = renderWithTestWrapper(MenuView, { repositoryListAction });

		await tick();
		await tick();

		const repo1Badge = screen.getByTestId('repository-repo1-badge-1');
		expect(repo1Badge).toBeInTheDocument();
		expect(repo1Badge).toHaveTextContent('5'); // repo1 has 5 branches

		const repo2Badge = screen.getByTestId('repository-repo2-badge-2');
		expect(repo2Badge).toBeInTheDocument();
		expect(repo2Badge).toHaveTextContent('3'); // repo2 has 3 branches

		// repo3 with 0 branches renders badge but without text content
		const repo3Badge = screen.getByTestId('repository-repo3-badge-3');
		expect(repo3Badge).toBeInTheDocument();
		// Badge is rendered but should be empty (no text)
		expect(repo3Badge).toHaveTextContent('');
	});

	it('renders the app title correctly', () => {
		const screen = renderWithTestWrapper(MenuView, { repositoryListAction });

		expect(screen.getByText('Cut Branches')).toBeInTheDocument();
	});

	it('displays the repositories heading', async () => {
		const screen = renderWithTestWrapper(MenuView, { repositoryListAction });

		await tick();
		await tick();

		expect(screen.getByText('Repositories')).toBeInTheDocument();
	});

	it('renders the add button for adding new repositories', () => {
		const screen = renderWithTestWrapper(MenuView, { repositoryListAction });

		// Check for the add button using accessible role and name
		expect(screen.getByRole('button', { name: /add a git repository/i })).toBeInTheDocument();
	});

	it('collapses to a rail and expands again via the toggle', async () => {
		const screen = renderWithTestWrapper(MenuView, { repositoryListAction });

		await tick();
		await tick();

		// Expanded by default: brand title and section heading are visible
		expect(screen.getByText('Cut Branches')).toBeInTheDocument();
		expect(screen.getByText('Repositories')).toBeInTheDocument();

		await screen.getByRole('button', { name: /collapse sidebar/i }).click();
		await tick();

		// Collapsed: title and heading are hidden, the expand toggle appears
		expect(screen.getByText('Cut Branches')).not.toBeInTheDocument();
		expect(screen.getByText('Repositories')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();

		// Repository labels are kept in the DOM for screen readers in the rail
		expect(screen.getByText('repo1')).toBeInTheDocument();

		await screen.getByRole('button', { name: /expand sidebar/i }).click();
		await tick();

		expect(screen.getByText('Cut Branches')).toBeInTheDocument();
		expect(screen.getByText('Repositories')).toBeInTheDocument();
	});

	it('persists the collapsed state to localStorage', async () => {
		const screen = renderWithTestWrapper(MenuView, { repositoryListAction });

		await tick();

		await screen.getByRole('button', { name: /collapse sidebar/i }).click();
		await tick();

		expect(localStorage.getItem('sidebar-collapsed')).toBe('true');
	});

	it('restores the collapsed state from localStorage on mount', async () => {
		localStorage.setItem('sidebar-collapsed', 'true');

		const screen = renderWithTestWrapper(MenuView, { repositoryListAction });

		await tick();
		await tick();

		// Starts collapsed: heading hidden and the expand toggle is shown
		expect(screen.getByText('Repositories')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
	});
});
