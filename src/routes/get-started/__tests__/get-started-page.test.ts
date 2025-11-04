import { describe, it, expect, beforeEach } from 'vitest';
import GetStartedPage from '../+page.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

describe('GetStartedPage', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('should render the page component', () => {
		renderWithTestWrapper(GetStartedPage);

		expect(document.body).toContainHTML('');
	});

	it('should render OnboardingView component', () => {
		renderWithTestWrapper(GetStartedPage);

		expect(document.body.innerHTML).not.toBe('');
	});

	it('should not crash with any props', () => {
		expect(() => {
			renderWithTestWrapper(GetStartedPage);
		}).not.toThrow();
	});
});
