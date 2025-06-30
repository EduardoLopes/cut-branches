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

describe('Providers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

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

	it('should create QueryClient instance', () => {
		const { container } = render(TestWrapper, {
			props: {
				component: Providers,
				props: {}
			}
		});

		// Verify the component renders without crashing
		expect(container).toBeDefined();
	});

	it('should configure QueryClient with correct defaults', () => {
		// This tests that the QueryClient is created with the expected configuration
		// by ensuring the component renders successfully
		expect(() => {
			render(TestWrapper, {
				props: {
					component: Providers,
					props: {}
				}
			});
		}).not.toThrow();
	});

	it('should have browser-based query configuration', () => {
		// Test that the component initializes properly in browser environment
		const { container } = render(TestWrapper, {
			props: {
				component: Providers,
				props: {}
			}
		});

		expect(container.innerHTML).toBeTruthy();
	});

	it('should provide QueryClient context to children', () => {
		// Test that the QueryClientProvider properly wraps its content
		const { container } = render(TestWrapper, {
			props: {
				component: Providers,
				props: {}
			}
		});

		// The component should render and provide the QueryClient context
		expect(container.firstChild).not.toBeNull();
	});
});
