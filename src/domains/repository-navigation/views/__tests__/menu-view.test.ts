import { render, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import MenuView from '../menu-view.svelte';
import TestWrapper, { testWrapperWithProps } from '$components/test-wrapper.svelte';

// Repository type uses camelCase fields (from bindings)
const mockRepositories = [
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
];

// Mock Tauri commands
vi.mock('$lib/bindings', () => ({
	commands: {
		getRepositoryList: vi.fn(() => Promise.resolve({ status: 'ok', data: mockRepositories }))
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
		const { getByText } = render(TestWrapper, {
			props: testWrapperWithProps(MenuView)
		});

		await waitFor(() => expect(getByText('repo1')).toBeInTheDocument());
		expect(getByText('repo2')).toBeInTheDocument();
		expect(getByText('repo3')).toBeInTheDocument();
	});

	it('displays badge counts for repositories with branches', async () => {
		const { getByText } = render(TestWrapper, {
			props: testWrapperWithProps(MenuView)
		});

		await waitFor(() => expect(getByText('5')).toBeInTheDocument()); // repo1 has 5 branches
		expect(getByText('3')).toBeInTheDocument(); // repo2 has 3 branches

		// repo3 has 0 branches, so no badge should be displayed
		expect(() => getByText('0')).toThrow();
	});

	it('renders the app title correctly', () => {
		const { getByText } = render(TestWrapper, {
			props: testWrapperWithProps(MenuView)
		});

		expect(getByText('Cut Branches')).toBeInTheDocument();
	});

	it('displays the repositories heading', () => {
		const { getByText } = render(TestWrapper, {
			props: testWrapperWithProps(MenuView)
		});

		expect(getByText('Repositories')).toBeInTheDocument();
	});

	it('renders the add button for adding new repositories', () => {
		const { getByRole } = render(TestWrapper, {
			props: testWrapperWithProps(MenuView)
		});

		// Check for the add button using accessible role and name
		expect(getByRole('button', { name: /add a git repository/i })).toBeInTheDocument();
	});
});
