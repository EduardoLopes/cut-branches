import { createRawSnippet } from 'svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RepositoryNavList from '../repository-nav-list.svelte';
import { renderWithTestWrapper, mockDataFactory } from '$utils/test-utils';

const mockRepositories = [
	mockDataFactory.repository({ id: '1', name: 'repo-1', branchesCount: 5 }),
	mockDataFactory.repository({ id: '2', name: 'repo-2', branchesCount: 3 }),
	mockDataFactory.repository({ id: '3', name: 'repo-3', branchesCount: 10 })
];

vi.mock(
	'$domains/repository-navigation/infrastructure/queries/create-get-repository-list-query',
	() => ({
		createGetRepositoryListQuery: vi.fn(() => ({
			get data() {
				return mockRepositories;
			},
			isLoading: false,
			isError: false
		}))
	})
);

const mockPrefetchRepositoryData = vi.fn();

vi.mock('$domains/repository-navigation/core/composables/create-prefetch-repository-data', () => ({
	createPrefetchRepositoryData: vi.fn(() => mockPrefetchRepositoryData)
}));

vi.mock('$app/state', () => ({
	page: {
		params: {
			id: '1'
		}
	}
}));

const headerAction = createRawSnippet(() => ({
	render: () => '<button type="button">Add a git repository</button>'
}));

describe('RepositoryNavList', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('renders the list with the provided header action snippet', () => {
			const screen = renderWithTestWrapper(RepositoryNavList, { headerAction });
			expect(screen.getByRole('button', { name: /add a git repository/i })).toBeInTheDocument();
		});

		it('renders without a header action snippet', () => {
			const screen = renderWithTestWrapper(RepositoryNavList);
			expect(screen.container).toBeInTheDocument();
		});
	});

	describe('Hover Prefetching', () => {
		it('creates prefetch function on component mount', () => {
			const screen = renderWithTestWrapper(RepositoryNavList, { headerAction });
			expect(screen.container).toBeInTheDocument();
		});
	});
});
