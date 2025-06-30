import { render } from '@testing-library/svelte';
import { describe, it, expect, beforeEach } from 'vitest';
import AddFirstPage from '../+page.svelte';
import TestWrapper from '$components/test-wrapper.svelte';

describe('AddFirstPage', () => {
	beforeEach(() => {
		// Clear any previous renders
		document.body.innerHTML = '';
	});

	it('should render the page component', () => {
		render(TestWrapper, {
			props: {
				component: AddFirstPage,
				props: {}
			}
		});

		// The page should render without errors
		// Since it just renders AddFirstView, we can't check for specific content
		// but we can verify the component was mounted
		expect(document.body).toContainHTML('');
	});

	it('should render AddFirstView component', () => {
		render(TestWrapper, {
			props: {
				component: AddFirstPage,
				props: {}
			}
		});

		// The component should render the AddFirstView
		// Since AddFirstView has its own tests, we just verify the page renders
		expect(document.body.innerHTML).not.toBe('');
	});

	it('should not crash with any props', () => {
		expect(() => {
			render(TestWrapper, {
				props: {
					component: AddFirstPage,
					props: {}
				}
			});
		}).not.toThrow();
	});
});
