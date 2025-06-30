import '@testing-library/jest-dom/vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { vi, expect, afterEach } from 'vitest';

expect.extend(matchers);

Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: (query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {}, // deprecated
		removeListener: () => {}, // deprecated
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => {}
	})
});

window.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));

HTMLDialogElement.prototype.show = vi.fn();
HTMLDialogElement.prototype.showModal = vi.fn();
HTMLDialogElement.prototype.close = vi.fn();

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

// Mock Tauri API globally
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn().mockResolvedValue(
		JSON.stringify({
			id: 'test-repo',
			name: 'test-repo',
			path: '/test/path',
			currentBranch: 'main',
			branchesCount: 1,
			branches: [
				{
					name: 'main',
					current: true,
					lastCommit: {
						sha: 'abc123',
						shortSha: 'abc123',
						date: new Date().toISOString(),
						message: 'Initial commit',
						author: 'Test User',
						email: 'test@example.com'
					},
					fullyMerged: false
				}
			]
		})
	)
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn().mockResolvedValue('/test/path')
}));

// Mock TanStack Query
vi.mock('@tanstack/svelte-query', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		createQuery: vi.fn(() => ({
			isLoading: false,
			isError: false,
			isSuccess: false,
			data: null,
			error: null
		})),
		createMutation: vi.fn(() => ({
			mutate: vi.fn(),
			isLoading: false,
			isError: false,
			isSuccess: false,
			isPending: false,
			error: null
		})),
		QueryClient: actual.QueryClient,
		QueryClientProvider: actual.QueryClientProvider
	};
});

afterEach(() => {
	vi.clearAllTimers();
});
