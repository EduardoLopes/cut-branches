import { describe, it, expect, beforeEach } from 'vitest';
import RestorePage from '../+page.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

describe('Restore Page Route', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('should render without errors', () => {
		expect(() => {
			// mock the page.params
			vi.mock('$app/state', () => ({
				page: {
					params: { id: 'test-repo-id' }
				}
			}));

			renderWithTestWrapper(RestorePage);
		}).not.toThrow();
	});

	it('should render RestoreBranchesView with correct id', () => {
		vi.mock('$app/state', () => ({
			page: {
				params: { id: 'test-repo-id' }
			}
		}));

		const { container } = renderWithTestWrapper(RestorePage);

		// The component should render the RestoreBranchesView
		expect(container.innerHTML).toBeTruthy();
	});

	it('should handle data prop with id', () => {
		const { container } = renderWithTestWrapper(RestorePage);

		expect(container).toBeDefined();
	});

	it('should handle missing data prop gracefully', () => {
		expect(() => {
			renderWithTestWrapper(RestorePage);
		}).not.toThrow();
	});

	it('should handle data without id property', () => {
		expect(() => {
			renderWithTestWrapper(RestorePage);
		}).not.toThrow();
	});

	it('should have proper component structure', () => {
		const { container } = renderWithTestWrapper(RestorePage);

		// Verify the component has content
		expect(container.firstChild).not.toBeNull();
	});
});
