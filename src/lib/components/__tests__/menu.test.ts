import { render } from '@testing-library/svelte';
import Menu from '../menu.svelte';
import TestWrapper, { testWrapperWithProps } from '../test-wrapper.svelte';

// Define the mock for $app/state
vi.mock('$app/state', () => ({
	page: {
		params: { id: '1' }
	}
}));

// Mock repository store with hardcoded values
vi.mock('$lib/stores/repository.svelte', () => {
	// Define the repo names inside the mock factory
	const repoNames = ['repo1', 'repo2', 'repo3'];

	return {
		RepositoryStore: {
			loadRepositories: vi.fn(),
			repositories: {
				size: repoNames.length,
				has: (key: string) => repoNames.includes(key),
				add: vi.fn(),
				delete: vi.fn(),
				clear: vi.fn(),
				forEach: (callback: (value: string) => void) => repoNames.forEach(callback),
				get list() {
					return repoNames;
				}
			}
		},
		getRepositoryStore: vi.fn().mockImplementation((repoName: string) => {
			if (repoName === 'repo1') {
				return { state: { id: '1', name: 'repo1', branchesCount: 5 } };
			} else if (repoName === 'repo2') {
				return { state: { id: '2', name: 'repo2', branchesCount: 3 } };
			} else if (repoName === 'repo3') {
				return { state: { id: '3', name: 'repo3', branchesCount: 0 } };
			}
			return { state: undefined };
		})
	};
});

describe('Menu Component', () => {
	it('renders all repositories in the list', () => {
		const { getByText } = render(TestWrapper, {
			props: testWrapperWithProps(Menu)
		});

		expect(getByText('repo1')).toBeInTheDocument();
		expect(getByText('repo2')).toBeInTheDocument();
		expect(getByText('repo3')).toBeInTheDocument();
	});

	it('displays badge counts for repositories with branches', () => {
		const { getByText } = render(TestWrapper, {
			props: testWrapperWithProps(Menu)
		});

		expect(getByText('5')).toBeInTheDocument(); // repo1 has 5 branches
		expect(getByText('3')).toBeInTheDocument(); // repo2 has 3 branches

		// repo3 has 0 branches, so no badge should be displayed
		expect(() => getByText('0')).toThrow();
	});

	it('renders the app title correctly', () => {
		const { getByText } = render(TestWrapper, {
			props: testWrapperWithProps(Menu)
		});

		expect(getByText('Cut Branches')).toBeInTheDocument();
	});

	it('displays the repositories heading', () => {
		const { getByText } = render(TestWrapper, {
			props: testWrapperWithProps(Menu)
		});

		expect(getByText('Repositories')).toBeInTheDocument();
	});

	it('renders the add button for adding new repositories', () => {
		const { getByRole } = render(TestWrapper, {
			props: testWrapperWithProps(Menu)
		});

		// Check for the add button using accessible role and name
		expect(getByRole('button', { name: /add a git repository/i })).toBeInTheDocument();
	});
});
