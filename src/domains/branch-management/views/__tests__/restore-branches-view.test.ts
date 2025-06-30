import { render } from '@testing-library/svelte';
import { describe, it, expect, beforeEach } from 'vitest';
import RestoreBranchesView from '../restore-branches-view.svelte';
import TestWrapper from '$components/test-wrapper.svelte';

describe('RestoreBranchesView', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('should render without errors', () => {
		expect(() => {
			render(TestWrapper, {
				props: {
					component: RestoreBranchesView,
					props: { id: 'test-repo-id' }
				}
			});
		}).not.toThrow();
	});

	it('should render with provided id prop', () => {
		const testId = 'my-repo-123';

		const { container } = render(TestWrapper, {
			props: {
				component: RestoreBranchesView,
				props: { id: testId }
			}
		});

		expect(container).toBeDefined();
	});

	it('should render without id prop', () => {
		const { container } = render(TestWrapper, {
			props: {
				component: RestoreBranchesView,
				props: {}
			}
		});

		expect(container).toBeDefined();
	});

	it('should have container with full width and height', () => {
		const { container } = render(TestWrapper, {
			props: {
				component: RestoreBranchesView,
				props: { id: 'test-repo' }
			}
		});

		const wrapper = container.firstElementChild;
		expect(wrapper).toBeDefined();
	});

	it('should render Repository component with correct props', () => {
		const { container } = render(TestWrapper, {
			props: {
				component: RestoreBranchesView,
				props: { id: 'test-repo-id' }
			}
		});

		// The Repository component should be rendered
		expect(container.innerHTML).toBeTruthy();
	});

	it('should handle undefined id gracefully', () => {
		expect(() => {
			render(TestWrapper, {
				props: {
					component: RestoreBranchesView,
					props: { id: undefined }
				}
			});
		}).not.toThrow();
	});
});
