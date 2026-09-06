import { tick } from 'svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RedirectToApp from '../redirect-to-app.svelte';
import { goto } from '$app/navigation';
import { DEFAULT_REPOSITORY_SORT, repositorySort } from '$lib/repository-sort.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

// Mutable query + location state driven per test
interface MockRepository {
	id: string;
	name: string;
	branchesCount: number;
}

let mockData: MockRepository[] | undefined = [];
let mockIsPending = false;
let mockIsLoading = false;
let mockPathname = '/';

const repository = (id: string, name: string, branchesCount = 1): MockRepository => ({
	id,
	name,
	branchesCount
});

// Raw order is deliberately not alphabetical: the backend returns insertion order,
// so these fixtures prove the redirect follows the sidebar's sort instead.
const unsortedRepositories = [
	repository('zeta', 'zeta'),
	repository('alpha', 'alpha'),
	repository('mid', 'mid')
];

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$app/state', () => ({
	page: {
		get url() {
			return { pathname: mockPathname };
		}
	}
}));

let mockLastRepository: string | undefined;

vi.mock('$lib/last-repository.svelte', () => ({
	lastRepository: {
		get current() {
			return mockLastRepository;
		},
		set: vi.fn()
	}
}));

const mockPrefetchNow = vi.fn();

vi.mock('$lib/create-prefetch-repository-data', () => ({
	createPrefetchRepositoryData: () =>
		Object.assign(vi.fn(), { now: mockPrefetchNow, cancel: vi.fn() })
}));

vi.mock('$infrastructure/queries/create-get-repository-list-query', () => ({
	createGetRepositoryListQuery: vi.fn(() => ({
		get data() {
			return mockData;
		},
		get isPending() {
			return mockIsPending;
		},
		get isLoading() {
			return mockIsLoading;
		}
	}))
}));

async function settle() {
	await tick();
	await tick();
}

describe('RedirectToApp', () => {
	beforeEach(() => {
		mockData = [];
		mockIsPending = false;
		mockIsLoading = false;
		mockPathname = '/';
		mockLastRepository = undefined;
		localStorage.clear();
		repositorySort.setMode(DEFAULT_REPOSITORY_SORT);
		vi.clearAllMocks();
	});

	describe('startup warm-up', () => {
		it('warms the remembered repository alongside the list, not after it', async () => {
			mockPathname = '/';
			mockLastRepository = 'alpha';
			// Still loading: the point is that the prefetch does not wait for the
			// list to resolve — the id came out of localStorage.
			mockIsLoading = true;
			await renderWithTestWrapper(RedirectToApp);
			await settle();

			expect(mockPrefetchNow).toHaveBeenCalledWith('alpha');
			expect(goto).not.toHaveBeenCalled();
		});

		it('warms nothing when there is no remembered repository', async () => {
			mockPathname = '/';
			mockLastRepository = undefined;
			await renderWithTestWrapper(RedirectToApp);
			await settle();

			expect(mockPrefetchNow).not.toHaveBeenCalled();
		});

		it('warms nothing outside the launch path', async () => {
			// `/repos` mid-session deliberately reopens the sidebar's first entry,
			// not the remembered one — so warming the remembered id would be wrong.
			mockPathname = '/repos';
			mockLastRepository = 'alpha';
			await renderWithTestWrapper(RedirectToApp);
			await settle();

			expect(mockPrefetchNow).not.toHaveBeenCalled();
		});
	});

	it('does not redirect while the query is loading', async () => {
		mockIsLoading = true;
		await renderWithTestWrapper(RedirectToApp);
		await settle();

		expect(goto).not.toHaveBeenCalled();
	});

	it('redirects empty users to the app shell', async () => {
		mockData = [];
		mockPathname = '/';
		await renderWithTestWrapper(RedirectToApp);
		await settle();

		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/repos'));
	});

	it('does not redirect empty users already on the repos index', async () => {
		mockData = [];
		mockPathname = '/repos';
		await renderWithTestWrapper(RedirectToApp);
		await settle();

		expect(goto).not.toHaveBeenCalled();
	});

	it('redirects to the first repository from the repos index when repositories exist', async () => {
		mockData = [repository('abc', 'abc')];
		mockPathname = '/repos';
		await renderWithTestWrapper(RedirectToApp);
		await settle();

		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/repos/abc'));
	});

	it('redirects to the first repository from the root page when repositories exist', async () => {
		mockData = [repository('abc', 'abc')];
		mockPathname = '/';
		await renderWithTestWrapper(RedirectToApp);
		await settle();

		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/repos/abc'));
	});

	it('opens the sidebar order first repository, not the raw list order', async () => {
		mockData = unsortedRepositories;
		mockPathname = '/';
		await renderWithTestWrapper(RedirectToApp);
		await settle();

		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/repos/alpha'));
	});

	it('honours the persisted sort mode when picking the first repository', async () => {
		repositorySort.setMode('name-desc');
		mockData = unsortedRepositories;
		mockPathname = '/';
		await renderWithTestWrapper(RedirectToApp);
		await settle();

		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/repos/zeta'));
	});

	it('reopens the last used repository at launch', async () => {
		mockLastRepository = 'mid';
		mockData = unsortedRepositories;
		mockPathname = '/';
		await renderWithTestWrapper(RedirectToApp);
		await settle();

		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/repos/mid'));
	});

	it('falls back to the first repository when the remembered one is gone', async () => {
		mockLastRepository = 'removed';
		mockData = unsortedRepositories;
		mockPathname = '/';
		await renderWithTestWrapper(RedirectToApp);
		await settle();

		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/repos/alpha'));
	});

	it('ignores the remembered repository on the repos index mid-session', async () => {
		mockLastRepository = 'mid';
		mockData = unsortedRepositories;
		mockPathname = '/repos';
		await renderWithTestWrapper(RedirectToApp);
		await settle();

		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/repos/alpha'));
	});

	it('does not redirect empty users on the settings root', async () => {
		mockData = [];
		mockPathname = '/settings';
		await renderWithTestWrapper(RedirectToApp);
		await settle();

		expect(goto).not.toHaveBeenCalled();
	});

	it('does not redirect empty users on a settings subroute', async () => {
		mockData = [];
		mockPathname = '/settings/feature-flags';
		await renderWithTestWrapper(RedirectToApp);
		await settle();

		expect(goto).not.toHaveBeenCalled();
	});

	it('does not redirect when repositories exist and the user is on a repository page', async () => {
		mockData = [repository('abc', 'abc')];
		mockPathname = '/repos/abc';
		await renderWithTestWrapper(RedirectToApp);
		await settle();

		expect(goto).not.toHaveBeenCalled();
	});
});
