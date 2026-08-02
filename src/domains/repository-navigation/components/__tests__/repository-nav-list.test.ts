import { createRawSnippet } from 'svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RepositoryNavList from '../repository-nav-list.svelte';
import { repositorySort } from '$lib/repository-sort.svelte';
import { renderWithTestWrapper, mockDataFactory } from '$utils/test-utils';

const mockRepositories = [
	mockDataFactory.repository({ id: '1', name: 'repo-1', branchesCount: 5 }),
	mockDataFactory.repository({ id: '2', name: 'repo-2', branchesCount: 3 }),
	mockDataFactory.repository({ id: '3', name: 'repo-3', branchesCount: 10 })
];

vi.mock('$infrastructure/queries/create-get-repository-list-query', () => ({
	createGetRepositoryListQuery: vi.fn(() => ({
		get data() {
			return mockRepositories;
		},
		isLoading: false,
		isError: false
	}))
}));

// Mirrors the real composable's shape: a debounced call with an immediate
// `.now` escape hatch (pointerdown) and a `.cancel` for unmount.
const mockPrefetchRepositoryData = Object.assign(vi.fn(), {
	now: vi.fn(),
	cancel: vi.fn()
});

vi.mock('$lib/create-prefetch-repository-data', () => ({
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

/** Reads the rendered repository order from the nav links' hrefs. */
function renderedOrder(container: HTMLElement): string[] {
	return Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href^="/repos/"]')).map(
		(anchor) => anchor.getAttribute('href')?.replace('/repos/', '') ?? ''
	);
}

describe('RepositoryNavList', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		repositorySort.setMode('name-asc');
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

		it('renders as a collapsed rail', () => {
			const screen = renderWithTestWrapper(RepositoryNavList, { compact: 'stack' });
			expect(screen.container).toBeInTheDocument();
		});
	});

	describe('Hover Prefetching', () => {
		it('creates prefetch function on component mount', () => {
			const screen = renderWithTestWrapper(RepositoryNavList, { headerAction });
			expect(screen.container).toBeInTheDocument();
		});
	});

	describe('Sorting', () => {
		it('orders the list by name ascending by default', () => {
			const screen = renderWithTestWrapper(RepositoryNavList);
			expect(renderedOrder(screen.container)).toEqual(['1', '2', '3']);
		});

		it('reflects the shared sort preference', () => {
			repositorySort.setMode('branches-desc');
			const screen = renderWithTestWrapper(RepositoryNavList);
			expect(renderedOrder(screen.container)).toEqual(['3', '1', '2']);
		});
	});
});
