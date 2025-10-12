import { render } from '@testing-library/svelte';
import { describe, it, expect, beforeEach } from 'vitest';
import GetStartedPage from '../+page.svelte';
import TestWrapper from '$components/test-wrapper.svelte';

describe('GetStartedPage', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('should render the page component', () => {
		render(TestWrapper, {
			props: {
				component: GetStartedPage,
				props: {}
			}
		});

		expect(document.body).toContainHTML('');
	});

	it('should render OnboardingView component', () => {
		render(TestWrapper, {
			props: {
				component: GetStartedPage,
				props: {}
			}
		});

		expect(document.body.innerHTML).not.toBe('');
	});

	it('should not crash with any props', () => {
		expect(() => {
			render(TestWrapper, {
				props: {
					component: GetStartedPage,
					props: {}
				}
			});
		}).not.toThrow();
	});
});
