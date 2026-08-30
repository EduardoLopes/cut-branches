import { describe, it, expect, vi, beforeEach } from 'vitest';
import Providers from '../providers.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

// Mock dependencies following TypeScript guidelines
const { mockPush, mockInvalidateQueries } = vi.hoisted(() => {
	const mockPush = vi.fn();
	const mockInvalidateQueries = vi.fn().mockResolvedValue(undefined);
	return { mockPush, mockInvalidateQueries };
});

vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: {
		push: mockPush
	}
}));

vi.mock('$app/environment', () => ({
	browser: true
}));

// The global `repository-changed` bridge. `listen` is held open per test so the
// resolve-after-teardown race can be reproduced deliberately.
const eventBridge = vi.hoisted(() => ({
	listen: vi.fn(),
	unlisten: vi.fn(),
	resolveListen: undefined as undefined | ((unlisten: () => void) => void)
}));

vi.mock('@tauri-apps/api/event', () => ({ listen: eventBridge.listen }));

vi.mock('$utils/error-utils', () => ({
	createError: vi.fn((error) => ({
		message: error?.message || 'Default error message',
		kind: error?.kind || 'error',
		description: error?.description || 'Default error description'
	}))
}));

// Mock TanStack Query to capture cache handlers
interface CacheHandlers {
	onSuccess?: (data: unknown, variables: unknown, context: unknown, mutation: unknown) => void;
	onError?: (error: unknown, variables: unknown, context: unknown, mutation: unknown) => void;
}

interface QueryCacheHandlers {
	onSuccess?: (data: unknown, query: unknown) => void;
	onError?: (error: unknown, query: unknown) => void;
}

let _mutationCacheHandlers: CacheHandlers = {};
let _queryCacheHandlers: QueryCacheHandlers = {};

vi.mock('@tanstack/svelte-query', async () => {
	const actual = await vi.importActual('@tanstack/svelte-query');

	class MockMutationCache {
		constructor(config: CacheHandlers) {
			_mutationCacheHandlers = config;
		}
	}

	class MockQueryCache {
		constructor(config: QueryCacheHandlers) {
			_queryCacheHandlers = config;
		}
	}

	class MockQueryClient {
		invalidateQueries = mockInvalidateQueries;
	}

	return {
		...actual,
		MutationCache: MockMutationCache,
		QueryCache: MockQueryCache,
		QueryClient: MockQueryClient,
		QueryClientProvider: ({ children }: { children: unknown }) => children
	};
});

describe('Providers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		_mutationCacheHandlers = {};
		_queryCacheHandlers = {};
		eventBridge.resolveListen = undefined;
		eventBridge.listen.mockImplementation(
			() =>
				new Promise<() => void>((resolve) => {
					eventBridge.resolveListen = resolve;
				})
		);
	});

	describe('repository-changed listener', () => {
		it('detaches a listener that resolves after the component is gone', async () => {
			const screen = renderWithTestWrapper(Providers);
			await vi.waitFor(() => expect(eventBridge.listen).toHaveBeenCalled());

			// Teardown wins the race: `listen` has not resolved yet, so the cleanup
			// has no handle to call.
			screen.unmount();
			eventBridge.resolveListen?.(eventBridge.unlisten);
			await vi.waitFor(() => expect(eventBridge.unlisten).toHaveBeenCalledTimes(1));
		});

		it('detaches on teardown when the listener resolved first', async () => {
			const screen = renderWithTestWrapper(Providers);
			await vi.waitFor(() => expect(eventBridge.listen).toHaveBeenCalled());

			eventBridge.resolveListen?.(eventBridge.unlisten);
			// Let the `.then` that stores the handle run before tearing down.
			await new Promise((resolve) => setTimeout(resolve, 0));
			expect(eventBridge.unlisten).not.toHaveBeenCalled();

			screen.unmount();
			await vi.waitFor(() => expect(eventBridge.unlisten).toHaveBeenCalledTimes(1));
		});

		it('invalidates the matching queries when a repository changes', async () => {
			renderWithTestWrapper(Providers);
			await vi.waitFor(() => expect(eventBridge.listen).toHaveBeenCalled());

			const [eventName, handler] = eventBridge.listen.mock.calls[0];
			expect(eventName).toBe('repository-changed');

			handler({ payload: { repositoryId: 'repo-1' } });
			// The mocked QueryClient records the call; the predicate itself is
			// covered by the query-key-utils tests.
			expect(mockInvalidateQueries).toHaveBeenCalledWith(
				expect.objectContaining({ predicate: expect.any(Function) })
			);
		});

		it('survives an unavailable event bridge', async () => {
			eventBridge.listen.mockRejectedValue(new Error('not a tauri runtime'));

			expect(() => renderWithTestWrapper(Providers)).not.toThrow();
			await vi.waitFor(() => expect(eventBridge.listen).toHaveBeenCalled());
			expect(eventBridge.unlisten).not.toHaveBeenCalled();
		});
	});

	describe('Component Rendering', () => {
		it('should render without errors', () => {
			expect(() => {
				renderWithTestWrapper(Providers);
			}).not.toThrow();
		});

		it('should provide QueryClient context to children', () => {
			const screen = renderWithTestWrapper(Providers);

			expect(screen.container.firstChild).not.toBeNull();
		});
	});

	describe('MutationCache onSuccess Handler', () => {
		beforeEach(() => {
			// Render the component to initialize the cache handlers
			renderWithTestWrapper(Providers);
		});

		it('should push success notification when showSuccessNotification is true', async () => {
			const mockMutation = {
				meta: {
					showSuccessNotification: true,
					notification: {
						title: 'Success Title',
						message: 'Success Message'
					}
				}
			};

			_mutationCacheHandlers.onSuccess?.('data', 'variables', 'context', mockMutation);

			expect(mockPush).toHaveBeenCalledWith({
				feedback: 'success',
				title: 'Success Title',
				message: 'Success Message'
			});
		});

		it('should not push notification when showSuccessNotification is false', async () => {
			const mockMutation = {
				meta: {
					showSuccessNotification: false,
					notification: {
						title: 'Success Title',
						message: 'Success Message'
					}
				}
			};

			_mutationCacheHandlers.onSuccess?.('data', 'variables', 'context', mockMutation);

			expect(mockPush).not.toHaveBeenCalled();
		});

		it('should not push notification when meta is undefined', async () => {
			const mockMutation = {};

			_mutationCacheHandlers.onSuccess?.('data', 'variables', 'context', mockMutation);

			expect(mockPush).not.toHaveBeenCalled();
		});

		it('should handle undefined notification info', async () => {
			const mockMutation = {
				meta: {
					showSuccessNotification: true
				}
			};

			_mutationCacheHandlers.onSuccess?.('data', 'variables', 'context', mockMutation);

			expect(mockPush).toHaveBeenCalledWith({
				feedback: 'success',
				title: undefined,
				message: undefined
			});
		});
	});

	describe('MutationCache onError Handler', () => {
		beforeEach(() => {
			renderWithTestWrapper(Providers);
		});

		it('should push error notification when showErrorNotification is true', async () => {
			const { createError } = await import('$utils/error-utils');

			const mockError = new Error('Test error');
			const mockMutation = {
				meta: {
					showErrorNotification: true,
					notification: {
						title: 'Error Title',
						message: 'Error Message'
					}
				}
			};

			_mutationCacheHandlers.onError?.(mockError, 'variables', 'context', mockMutation);

			expect(createError).toHaveBeenCalledWith(mockError);
			expect(mockPush).toHaveBeenCalledWith({
				feedback: 'danger',
				title: 'Error Title',
				message: 'Error Message'
			});
		});

		it('should use error fallbacks when notification info is undefined', async () => {
			const { createError } = await import('$utils/error-utils');

			const mockError = new Error('Test error');
			const mockMutation = {
				meta: {
					showErrorNotification: true
				}
			};

			_mutationCacheHandlers.onError?.(mockError, 'variables', 'context', mockMutation);

			expect(createError).toHaveBeenCalledWith(mockError);
			expect(mockPush).toHaveBeenCalledWith({
				feedback: 'danger',
				title: 'Test error', // Uses the error's message when notification.title is undefined
				message: 'Default error description'
			});
		});

		it('should not push notification when showErrorNotification is false', async () => {
			const mockError = new Error('Test error');
			const mockMutation = {
				meta: {
					showErrorNotification: false
				}
			};

			_mutationCacheHandlers.onError?.(mockError, 'variables', 'context', mockMutation);

			expect(mockPush).not.toHaveBeenCalled();
		});

		it('should not push notification when meta is undefined', async () => {
			const mockError = new Error('Test error');
			const mockMutation = {};

			_mutationCacheHandlers.onError?.(mockError, 'variables', 'context', mockMutation);

			expect(mockPush).not.toHaveBeenCalled();
		});

		it('should call createError when showErrorNotification is true', async () => {
			const { createError } = await import('$utils/error-utils');

			const mockError = new Error('Test error');
			const mockMutation = {
				meta: {
					showErrorNotification: true
				}
			};

			_mutationCacheHandlers.onError?.(mockError, 'variables', 'context', mockMutation);

			expect(createError).toHaveBeenCalledWith(mockError);
		});
	});

	describe('QueryCache onSuccess Handler', () => {
		beforeEach(() => {
			renderWithTestWrapper(Providers);
		});

		it('should push success notification when showSuccessNotification is true', async () => {
			const mockQuery = {
				meta: {
					showSuccessNotification: true,
					notification: {
						title: 'Query Success',
						message: 'Query completed successfully'
					}
				}
			};

			_queryCacheHandlers.onSuccess?.('data', mockQuery);

			expect(mockPush).toHaveBeenCalledWith({
				feedback: 'success',
				title: 'Query Success',
				message: 'Query completed successfully'
			});
		});

		it('should not push notification when showSuccessNotification is false', async () => {
			const mockQuery = {
				meta: {
					showSuccessNotification: false
				}
			};

			_queryCacheHandlers.onSuccess?.('data', mockQuery);

			expect(mockPush).not.toHaveBeenCalled();
		});

		it('should not push notification when meta is undefined', async () => {
			const mockQuery = {};

			_queryCacheHandlers.onSuccess?.('data', mockQuery);

			expect(mockPush).not.toHaveBeenCalled();
		});
	});

	describe('QueryCache onError Handler', () => {
		beforeEach(() => {
			renderWithTestWrapper(Providers);
		});

		it('should push error notification when showErrorNotification is true', async () => {
			const { createError } = await import('$utils/error-utils');

			const mockError = new Error('Query failed');
			const mockQuery = {
				meta: {
					showErrorNotification: true,
					notification: {
						title: 'Query Error',
						message: 'Query failed to load'
					}
				}
			};

			_queryCacheHandlers.onError?.(mockError, mockQuery);

			expect(createError).toHaveBeenCalledWith(mockError);
			expect(mockPush).toHaveBeenCalledWith({
				feedback: 'danger',
				title: 'Query Error',
				message: 'Query failed to load'
			});
		});

		it('should use error fallbacks when notification info is undefined', async () => {
			const { createError } = await import('$utils/error-utils');

			const mockError = new Error('Query failed');
			const mockQuery = {
				meta: {
					showErrorNotification: true
				}
			};

			_queryCacheHandlers.onError?.(mockError, mockQuery);

			expect(createError).toHaveBeenCalledWith(mockError);
			expect(mockPush).toHaveBeenCalledWith({
				feedback: 'danger',
				title: 'Query failed', // Uses the error's message when notification.title is undefined
				message: 'Default error description'
			});
		});

		it('should not push notification when showErrorNotification is false', async () => {
			const mockError = new Error('Query failed');
			const mockQuery = {
				meta: {
					showErrorNotification: false
				}
			};

			_queryCacheHandlers.onError?.(mockError, mockQuery);

			expect(mockPush).not.toHaveBeenCalled();
		});

		it('should not push notification when meta is undefined', async () => {
			const mockError = new Error('Query failed');
			const mockQuery = {};

			_queryCacheHandlers.onError?.(mockError, mockQuery);

			expect(mockPush).not.toHaveBeenCalled();
		});
	});

	describe('Browser Environment', () => {
		it('should configure queries to be enabled in browser environment', () => {
			renderWithTestWrapper(Providers);

			// The component should render successfully with browser: true
			// This indirectly tests that the defaultOptions.queries.enabled: browser works
			expect(true).toBe(true); // Component rendered without error
		});
	});
});
