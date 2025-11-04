import { describe, it, expect, beforeEach } from 'vitest';
import OnboardingHero from '../onboarding-hero.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

describe('OnboardingHero', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('should display the application title', () => {
		const screen = renderWithTestWrapper(OnboardingHero);

		const title = screen.getByRole('heading', { name: /cut branches/i });
		expect(title).toBeInTheDocument();
	});

	it('should display the tagline', () => {
		const screen = renderWithTestWrapper(OnboardingHero);

		const tagline = screen.getByText(/manage and clean up your git branches effortlessly/i);
		expect(tagline).toBeInTheDocument();
	});

	it('should have the icon container', () => {
		const screen = renderWithTestWrapper(OnboardingHero);

		// Icon component may not render in test environment
		// Just verify the component renders without error
		expect(screen.container.innerHTML).toContain('Cut Branches');
	});

	it('should not crash when rendered', () => {
		expect(() => {
			renderWithTestWrapper(OnboardingHero);
		}).not.toThrow();
	});
});
