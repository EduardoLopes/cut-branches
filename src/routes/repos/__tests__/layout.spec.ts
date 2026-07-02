import { describe, it, expect, vi } from 'vitest';
import ReposLayout from '../+layout.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

vi.mock('$domains/repository-navigation/views/sidebar-view.svelte', () => {
	const MockSidebarView = vi.fn(() => ({
		// Basic Svelte component mock structure
		$$: { ctx: {} },
		$capture_state: () => {},
		$inject_state: () => {},
		$destroy: () => {},
		$set: vi.fn(),
		$on: vi.fn()
	}));
	// Expose a an element for the test to find
	MockSidebarView.prototype.render_element = () => {
		const el = document.createElement('div');
		el.textContent = 'Mock SidebarView';
		el.setAttribute('data-testid', 'mock-sidebar-view');
		return el;
	};
	return { default: MockSidebarView };
});

describe('Repos Layout Integration', () => {
	it('should render the layout and call the mocked menu', async () => {
		renderWithTestWrapper(ReposLayout);
		// We can't easily assert the DOM content with this simple mock directly in the layout
		// Instead, let's check if the mock constructor was called.
		const SidebarViewMock = (
			await import('../../../domains/repository-navigation/views/sidebar-view.svelte')
		).default;
		expect(SidebarViewMock).toHaveBeenCalled();

		// And we can try to find the element if the layout appends it somehow,
		// or if the mock itself appended to a known global testing container,
		// but with Svelte's mounting, it is usually appended to a target provided by Svelte.
		// For this test, just checking if the layout renders without error and calls Menu is a good start.
		// To actually see "Mock Menu", the ReposLayout would need to call render_element and append it.
	});
});
