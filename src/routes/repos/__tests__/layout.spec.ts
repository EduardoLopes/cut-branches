import { render } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import ReposLayout from '../+layout.svelte';

vi.mock('$domains/navigation/components/menu.svelte', () => {
	const MockMenu = vi.fn(() => ({
		// Basic Svelte component mock structure
		$$: { ctx: {} },
		$capture_state: () => {},
		$inject_state: () => {},
		$destroy: () => {},
		$set: vi.fn(),
		$on: vi.fn()
	}));
	// Expose a an element for the test to find
	MockMenu.prototype.render_element = () => {
		const el = document.createElement('div');
		el.textContent = 'Mock Menu';
		el.setAttribute('data-testid', 'mock-menu');
		return el;
	};
	return { default: MockMenu };
});

describe('Repos Layout Integration', () => {
	it('should render the layout and call the mocked menu', async () => {
		render(ReposLayout);
		// We can't easily assert the DOM content with this simple mock directly in the layout
		// Instead, let's check if the mock constructor was called.
		const MenuMock = (await import('../../../domains/navigation/components/menu.svelte')).default;
		expect(MenuMock).toHaveBeenCalled();

		// And we can try to find the element if the layout appends it somehow,
		// or if the mock itself appended to a known global testing container,
		// but with Svelte's mounting, it is usually appended to a target provided by Svelte.
		// For this test, just checking if the layout renders without error and calls Menu is a good start.
		// To actually see "Mock Menu", the ReposLayout would need to call render_element and append it.
	});
});
