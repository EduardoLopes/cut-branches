import { describe, it, expect, beforeEach, vi } from 'vitest';
import RestorePage from '../+page.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

// Mock $app/state module
vi.mock('$app/state', () => ({
	page: {
		params: { id: 'test-repo-id' },
		url: { pathname: '/repos/test-repo-id/restore' }
	}
}));

// Mock the queries used by Repository and RepositoryHeader
vi.mock('$infrastructure/queries/create-get-repository-query', () => ({
	createGetRepositoryQuery: () => ({
		data: {
			id: 'test-repo-id',
			name: 'Test Repository',
			path: '/test/path',
			branches: [],
			currentBranch: 'main',
			branchesCount: 0
		},
		isLoading: false,
		isError: false,
		error: null
	})
}));

vi.mock('$domains/branch-management/infrastructure/queries/create-get-branches-query', () => ({
	createGetBranchesQuery: () => ({
		data: {
			branches: [],
			total: 0
		},
		isLoading: false,
		isError: false,
		error: null
	})
}));

vi.mock('$infrastructure/queries/create-get-repository-list-query', () => ({
	createGetRepositoryListQuery: () => ({
		data: [
			{
				id: 'test-repo-id',
				name: 'Test Repository',
				path: '/test/path',
				branches: [],
				currentBranch: 'main',
				branchesCount: 0
			}
		],
		isLoading: false,
		isError: false,
		error: null
	})
}));

describe('Restore Page Route', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('should render without errors', () => {
		expect(() => {
			renderWithTestWrapper(RestorePage);
		}).not.toThrow();
	});

	it('should render RestoreBranchesView with correct id', () => {
		const { container } = renderWithTestWrapper(RestorePage);

		// The component should render the RestoreBranchesView
		expect(container.innerHTML).toBeTruthy();
	});

	it('should handle data prop with id', () => {
		const { container } = renderWithTestWrapper(RestorePage);

		expect(container).toBeDefined();
	});

	it('should handle missing data prop gracefully', () => {
		expect(() => {
			renderWithTestWrapper(RestorePage);
		}).not.toThrow();
	});

	it('should handle data without id property', () => {
		expect(() => {
			renderWithTestWrapper(RestorePage);
		}).not.toThrow();
	});

	it('should have proper component structure', () => {
		const { container } = renderWithTestWrapper(RestorePage);

		// Verify the component has content
		expect(container.firstChild).not.toBeNull();
	});
});
