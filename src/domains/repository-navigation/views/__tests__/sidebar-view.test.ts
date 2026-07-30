import { createRawSnippet, tick } from 'svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SidebarView from '../sidebar-view.svelte';
import { sidebarCollapsed } from '$lib/sidebar-collapsed.svelte';
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

// Force the non-macOS chrome: these tests drive the sidebar's own toggle row,
// which macOS hands over to the window titlebar in the app shell instead.
vi.mock('$utils/is-macos', () => ({
	isMacOS: () => false
}));

describe('SidebarView Component', () => {
	beforeEach(() => {
		localStorage.clear();
		// The collapsed flag is a module-level store now, so it outlives an
		// unmount — reset it explicitly rather than relying on a fresh mount.
		sidebarCollapsed.set(false);
		localStorage.clear();
	});

	it('renders all repositories in the list', async () => {
		const screen = renderWithTestWrapper(SidebarView, { repositoryListAction });

		await tick();
		await tick();

		expect(screen.getByText('repo1')).toBeInTheDocument();
		expect(screen.getByText('repo2')).toBeInTheDocument();
		expect(screen.getByText('repo3')).toBeInTheDocument();
	});

	it('displays badge counts for repositories with branches', async () => {
		const screen = renderWithTestWrapper(SidebarView, { repositoryListAction });

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
		const screen = renderWithTestWrapper(SidebarView, { repositoryListAction });

		expect(screen.getByText('Cut Branches')).toBeInTheDocument();
	});

	it('displays the repositories heading', async () => {
		const screen = renderWithTestWrapper(SidebarView, { repositoryListAction });

		await tick();
		await tick();

		expect(screen.getByText('Repositories')).toBeInTheDocument();
	});

	it('renders the add button for adding new repositories', () => {
		const screen = renderWithTestWrapper(SidebarView, { repositoryListAction });

		// Check for the add button using accessible role and name
		expect(screen.getByRole('button', { name: /add a git repository/i })).toBeInTheDocument();
	});

	it('collapses to a rail and expands again via the toggle', async () => {
		const screen = renderWithTestWrapper(SidebarView, { repositoryListAction });

		await tick();
		await tick();

		// Expanded by default: brand title and section heading are visible
		expect(screen.getByText('Cut Branches')).toBeInTheDocument();
		expect(screen.getByText('Repositories')).toBeInTheDocument();

		await screen.getByRole('button', { name: /collapse sidebar/i }).click();
		await tick();

		// Collapsed: title and heading fold away (polled — they linger in the
		// DOM for the out-transition), the expand toggle appears
		await expect.element(screen.getByText('Cut Branches')).not.toBeInTheDocument();
		await expect.element(screen.getByText('Repositories')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();

		// Repository labels are kept in the DOM for screen readers in the rail
		expect(screen.getByText('repo1')).toBeInTheDocument();

		await screen.getByRole('button', { name: /expand sidebar/i }).click();
		await tick();

		expect(screen.getByText('Cut Branches')).toBeInTheDocument();
		expect(screen.getByText('Repositories')).toBeInTheDocument();
	});

	it('persists the collapsed state to localStorage', async () => {
		const screen = renderWithTestWrapper(SidebarView, { repositoryListAction });

		await tick();

		await screen.getByRole('button', { name: /collapse sidebar/i }).click();
		await tick();

		expect(localStorage.getItem('sidebar-collapsed')).toBe('true');
	});

	it('renders the rail when it mounts already collapsed', async () => {
		// The persisted value is read once when the store module loads, so set the
		// state itself rather than seeding localStorage before mounting.
		sidebarCollapsed.set(true);

		const screen = renderWithTestWrapper(SidebarView, { repositoryListAction });

		await tick();
		await tick();

		// Starts collapsed: heading hidden and the expand toggle is shown
		expect(screen.getByText('Repositories')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
	});
});
