import { createRawSnippet, tick } from 'svelte';
import { describe, it, expect, vi } from 'vitest';
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
});
