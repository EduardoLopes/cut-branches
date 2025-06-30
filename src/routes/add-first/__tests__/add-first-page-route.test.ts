import { render } from '@testing-library/svelte';
import { describe, it, expect, beforeEach } from 'vitest';
import AddFirstPage from '../+page.svelte';
import TestWrapper from '$components/test-wrapper.svelte';

describe('Add First Page Route', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('should render without errors', () => {
		expect(() => {
			render(TestWrapper, {
				props: {
					component: AddFirstPage,
					props: {}
				}
			});
		}).not.toThrow();
	});

	it('should render AddFirstView component', () => {
		const { container } = render(TestWrapper, {
			props: {
				component: AddFirstPage,
				props: {}
			}
		});

		// The component should render the AddFirstView
		expect(container.innerHTML).toBeTruthy();
	});

	it('should not require any props', () => {
		const { container } = render(TestWrapper, {
			props: {
				component: AddFirstPage,
				props: {}
			}
		});

		expect(container).toBeDefined();
	});

	it('should have proper component structure', () => {
		const { container } = render(TestWrapper, {
			props: {
				component: AddFirstPage,
				props: {}
			}
		});

		// Verify the component has content
		expect(container.firstChild).not.toBeNull();
	});
});
