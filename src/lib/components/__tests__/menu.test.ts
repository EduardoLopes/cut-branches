import { render } from '@testing-library/svelte';
import Menu from '../menu.svelte';
import TestWrapper, { testWrapperWithProps } from '../test-wrapper.svelte';

vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn().mockImplementation((fn) => {
			fn({ params: { id: '1' } });
			return () => {};
		})
	}
}));

vi.mock('$lib/stores/repository.svelte', () => ({
	RepositoryStore: {
		repositories: {
			list: [
				{ id: '1', name: 'repo1', branchesCount: 5 },
				{ id: '2', name: 'repo2', branchesCount: 3 },
				{ id: '3', name: 'repo3', branchesCount: 0 }
			]
		}
	},
	getRepositoryStore: vi.fn().mockImplementation((repo) => ({
		state: repo
	}))
}));

describe('Menu', () => {
	it('renders repositories', () => {
		const { getByText } = render(TestWrapper, {
			props: testWrapperWithProps(Menu)
		});
		expect(getByText('repo1')).toBeInTheDocument();
		expect(getByText('repo2')).toBeInTheDocument();
		expect(getByText('repo3')).toBeInTheDocument();
	});
});
