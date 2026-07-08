import { tick } from 'svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RedirectToApp from '../redirect-to-app.svelte';
import { goto } from '$app/navigation';
import { renderWithTestWrapper } from '$utils/test-utils';

// Mutable query + location state driven per test
let mockData: Array<{ id: string }> | undefined = [];
let mockIsPending = false;
let mockIsLoading = false;
let mockPathname = '/';

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
		vi.clearAllMocks();
	});

	it('does not redirect while the query is loading', async () => {
		mockIsLoading = true;
		renderWithTestWrapper(RedirectToApp);
		await settle();

		expect(goto).not.toHaveBeenCalled();
	});

	it('redirects empty users to the app shell', async () => {
		mockData = [];
		mockPathname = '/';
		renderWithTestWrapper(RedirectToApp);
		await settle();

		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/repos'));
	});

	it('does not redirect empty users already on the repos index', async () => {
		mockData = [];
		mockPathname = '/repos';
		renderWithTestWrapper(RedirectToApp);
		await settle();

		expect(goto).not.toHaveBeenCalled();
	});

	it('redirects to the first repository from the repos index when repositories exist', async () => {
		mockData = [{ id: 'abc' }];
		mockPathname = '/repos';
		renderWithTestWrapper(RedirectToApp);
		await settle();

		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/repos/abc'));
	});

	it('redirects to the first repository from the root page when repositories exist', async () => {
		mockData = [{ id: 'abc' }];
		mockPathname = '/';
		renderWithTestWrapper(RedirectToApp);
		await settle();

		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/repos/abc'));
	});

	it('does not redirect empty users on the settings root', async () => {
		mockData = [];
		mockPathname = '/settings';
		renderWithTestWrapper(RedirectToApp);
		await settle();

		expect(goto).not.toHaveBeenCalled();
	});

	it('does not redirect empty users on a settings subroute', async () => {
		mockData = [];
		mockPathname = '/settings/feature-flags';
		renderWithTestWrapper(RedirectToApp);
		await settle();

		expect(goto).not.toHaveBeenCalled();
	});

	it('does not redirect when repositories exist and the user is on a repository page', async () => {
		mockData = [{ id: 'abc' }];
		mockPathname = '/repos/abc';
		renderWithTestWrapper(RedirectToApp);
		await settle();

		expect(goto).not.toHaveBeenCalled();
	});
});
