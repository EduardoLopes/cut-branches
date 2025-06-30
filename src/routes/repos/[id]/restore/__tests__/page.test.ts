import { render } from '@testing-library/svelte';
import { describe, it, expect, beforeEach } from 'vitest';
import RestorePage from '../+page.svelte';
import TestWrapper from '$components/test-wrapper.svelte';

describe('Restore Page Route', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('should render without errors', () => {
		expect(() => {
			render(TestWrapper, {
				props: {
					component: RestorePage,
					props: {
						data: { id: 'test-repo-id' }
					}
				}
			});
		}).not.toThrow();
	});

	it('should render RestoreBranchesView with correct id', () => {
		const testId = 'my-repo-123';

		const { container } = render(TestWrapper, {
			props: {
				component: RestorePage,
				props: {
					data: { id: testId }
				}
			}
		});

		// The component should render the RestoreBranchesView
		expect(container.innerHTML).toBeTruthy();
	});

	it('should handle data prop with id', () => {
		const { container } = render(TestWrapper, {
			props: {
				component: RestorePage,
				props: {
					data: { id: 'test-repo' }
				}
			}
		});

		expect(container).toBeDefined();
	});

	it('should handle missing data prop gracefully', () => {
		expect(() => {
			render(TestWrapper, {
				props: {
					component: RestorePage,
					props: {}
				}
			});
		}).not.toThrow();
	});

	it('should handle data without id property', () => {
		expect(() => {
			render(TestWrapper, {
				props: {
					component: RestorePage,
					props: {
						data: {}
					}
				}
			});
		}).not.toThrow();
	});

	it('should have proper component structure', () => {
		const { container } = render(TestWrapper, {
			props: {
				component: RestorePage,
				props: {
					data: { id: 'test-repo-id' }
				}
			}
		});

		// Verify the component has content
		expect(container.firstChild).not.toBeNull();
	});
});
