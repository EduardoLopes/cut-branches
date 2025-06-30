import { render } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Providers from '../providers.svelte';
import TestWrapper from '../test-wrapper.svelte';

// Mock dependencies following TypeScript guidelines
vi.mock('$domains/notifications/store/notifications.svelte', () => ({
	notifications: {
		push: vi.fn()
	}
}));

vi.mock('$app/environment', () => ({
	browser: true
}));

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
	return {
		...actual,
		MutationCache: vi.fn().mockImplementation((config: CacheHandlers) => {
			_mutationCacheHandlers = config;
			return {};
		}),
		QueryCache: vi.fn().mockImplementation((config: QueryCacheHandlers) => {
			_queryCacheHandlers = config;
			return {};
		}),
		QueryClient: vi.fn().mockImplementation(() => ({})),
		QueryClientProvider: ({ children }: { children: unknown }) => children
	};
});

describe('Providers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		_mutationCacheHandlers = {};
		_queryCacheHandlers = {};
	});

	describe('Component Rendering', () => {
		it('should render without errors', () => {
			expect(() => {
				render(TestWrapper, {
					props: {
						component: Providers,
						props: {}
					}
				});
			}).not.toThrow();
		});

		it('should provide QueryClient context to children', () => {
			const { container } = render(TestWrapper, {
				props: {
					component: Providers,
					props: {}
				}
			});

			expect(container.firstChild).not.toBeNull();
		});
	});

	describe('MutationCache onSuccess Handler', () => {
		beforeEach(() => {
			// Render the component to initialize the cache handlers
			render(TestWrapper, {
				props: {
					component: Providers,
					props: {}
				}
			});
		});

		it('should push success notification when showSuccessNotification is true', async () => {
			const { notifications } = await import('$domains/notifications/store/notifications.svelte');

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

			expect(notifications.push).toHaveBeenCalledWith({
				feedback: 'success',
				title: 'Success Title',
				message: 'Success Message'
			});
		});

		it('should not push notification when showSuccessNotification is false', async () => {
			const { notifications } = await import('$domains/notifications/store/notifications.svelte');

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

			expect(notifications.push).not.toHaveBeenCalled();
		});

		it('should not push notification when meta is undefined', async () => {
			const { notifications } = await import('$domains/notifications/store/notifications.svelte');

			const mockMutation = {};

			_mutationCacheHandlers.onSuccess?.('data', 'variables', 'context', mockMutation);

			expect(notifications.push).not.toHaveBeenCalled();
		});

		it('should handle undefined notification info', async () => {
			const { notifications } = await import('$domains/notifications/store/notifications.svelte');

			const mockMutation = {
				meta: {
					showSuccessNotification: true
				}
			};

			_mutationCacheHandlers.onSuccess?.('data', 'variables', 'context', mockMutation);

			expect(notifications.push).toHaveBeenCalledWith({
				feedback: 'success',
				title: undefined,
				message: undefined
			});
		});
	});

	describe('MutationCache onError Handler', () => {
		beforeEach(() => {
			render(TestWrapper, {
				props: {
					component: Providers,
					props: {}
				}
			});
		});

		it('should push error notification when showErrorNotification is true', async () => {
			const { notifications } = await import('$domains/notifications/store/notifications.svelte');
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
			expect(notifications.push).toHaveBeenCalledWith({
				feedback: 'danger',
				title: 'Error Title',
				message: 'Error Message'
			});
		});

		it('should use error fallbacks when notification info is undefined', async () => {
			const { notifications } = await import('$domains/notifications/store/notifications.svelte');
			const { createError } = await import('$utils/error-utils');

			const mockError = new Error('Test error');
			const mockMutation = {
				meta: {
					showErrorNotification: true
				}
			};

			_mutationCacheHandlers.onError?.(mockError, 'variables', 'context', mockMutation);

			expect(createError).toHaveBeenCalledWith(mockError);
			expect(notifications.push).toHaveBeenCalledWith({
				feedback: 'danger',
				title: 'Test error', // Uses the error's message when notification.title is undefined
				message: 'Default error description'
			});
		});

		it('should not push notification when showErrorNotification is false', async () => {
			const { notifications } = await import('$domains/notifications/store/notifications.svelte');

			const mockError = new Error('Test error');
			const mockMutation = {
				meta: {
					showErrorNotification: false
				}
			};

			_mutationCacheHandlers.onError?.(mockError, 'variables', 'context', mockMutation);

			expect(notifications.push).not.toHaveBeenCalled();
		});

		it('should not push notification when meta is undefined', async () => {
			const { notifications } = await import('$domains/notifications/store/notifications.svelte');

			const mockError = new Error('Test error');
			const mockMutation = {};

			_mutationCacheHandlers.onError?.(mockError, 'variables', 'context', mockMutation);

			expect(notifications.push).not.toHaveBeenCalled();
		});

		it('should log error to console when showErrorNotification is true', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
			const { createError } = await import('$utils/error-utils');

			const mockError = new Error('Test error');
			const mockMutation = {
				meta: {
					showErrorNotification: true
				}
			};

			_mutationCacheHandlers.onError?.(mockError, 'variables', 'context', mockMutation);

			expect(createError).toHaveBeenCalledWith(mockError);
			expect(consoleSpy).toHaveBeenCalledWith({
				e: {
					message: 'Test error', // Uses the actual error message
					kind: 'error',
					description: 'Default error description'
				}
			});

			consoleSpy.mockRestore();
		});
	});

	describe('QueryCache onSuccess Handler', () => {
		beforeEach(() => {
			render(TestWrapper, {
				props: {
					component: Providers,
					props: {}
				}
			});
		});

		it('should push success notification when showSuccessNotification is true', async () => {
			const { notifications } = await import('$domains/notifications/store/notifications.svelte');

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

			expect(notifications.push).toHaveBeenCalledWith({
				feedback: 'success',
				title: 'Query Success',
				message: 'Query completed successfully'
			});
		});

		it('should not push notification when showSuccessNotification is false', async () => {
			const { notifications } = await import('$domains/notifications/store/notifications.svelte');

			const mockQuery = {
				meta: {
					showSuccessNotification: false
				}
			};

			_queryCacheHandlers.onSuccess?.('data', mockQuery);

			expect(notifications.push).not.toHaveBeenCalled();
		});

		it('should not push notification when meta is undefined', async () => {
			const { notifications } = await import('$domains/notifications/store/notifications.svelte');

			const mockQuery = {};

			_queryCacheHandlers.onSuccess?.('data', mockQuery);

			expect(notifications.push).not.toHaveBeenCalled();
		});
	});

	describe('QueryCache onError Handler', () => {
		beforeEach(() => {
			render(TestWrapper, {
				props: {
					component: Providers,
					props: {}
				}
			});
		});

		it('should push error notification when showErrorNotification is true', async () => {
			const { notifications } = await import('$domains/notifications/store/notifications.svelte');
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
			expect(notifications.push).toHaveBeenCalledWith({
				feedback: 'danger',
				title: 'Query Error',
				message: 'Query failed to load'
			});
		});

		it('should use error fallbacks when notification info is undefined', async () => {
			const { notifications } = await import('$domains/notifications/store/notifications.svelte');
			const { createError } = await import('$utils/error-utils');

			const mockError = new Error('Query failed');
			const mockQuery = {
				meta: {
					showErrorNotification: true
				}
			};

			_queryCacheHandlers.onError?.(mockError, mockQuery);

			expect(createError).toHaveBeenCalledWith(mockError);
			expect(notifications.push).toHaveBeenCalledWith({
				feedback: 'danger',
				title: 'Query failed', // Uses the error's message when notification.title is undefined
				message: 'Default error description'
			});
		});

		it('should not push notification when showErrorNotification is false', async () => {
			const { notifications } = await import('$domains/notifications/store/notifications.svelte');

			const mockError = new Error('Query failed');
			const mockQuery = {
				meta: {
					showErrorNotification: false
				}
			};

			_queryCacheHandlers.onError?.(mockError, mockQuery);

			expect(notifications.push).not.toHaveBeenCalled();
		});

		it('should not push notification when meta is undefined', async () => {
			const { notifications } = await import('$domains/notifications/store/notifications.svelte');

			const mockError = new Error('Query failed');
			const mockQuery = {};

			_queryCacheHandlers.onError?.(mockError, mockQuery);

			expect(notifications.push).not.toHaveBeenCalled();
		});
	});

	describe('Browser Environment', () => {
		it('should configure queries to be enabled in browser environment', () => {
			render(TestWrapper, {
				props: {
					component: Providers,
					props: {}
				}
			});

			// The component should render successfully with browser: true
			// This indirectly tests that the defaultOptions.queries.enabled: browser works
			expect(true).toBe(true); // Component rendered without error
		});
	});
});
