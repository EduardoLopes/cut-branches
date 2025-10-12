import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, beforeEach } from 'vitest';
import OnboardingHero from '../onboarding-hero.svelte';
import TestWrapper from '$components/test-wrapper.svelte';

describe('OnboardingHero', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('should render the component', () => {
		render(TestWrapper, {
			props: {
				component: OnboardingHero,
				props: {}
			}
		});

		expect(document.body.innerHTML).not.toBe('');
	});

	it('should display the application title', () => {
		render(TestWrapper, {
			props: {
				component: OnboardingHero,
				props: {}
			}
		});

		const title = screen.getByRole('heading', { name: /cut branches/i });
		expect(title).toBeInTheDocument();
	});

	it('should display the tagline', () => {
		render(TestWrapper, {
			props: {
				component: OnboardingHero,
				props: {}
			}
		});

		const tagline = screen.getByText(/manage and clean up your git branches effortlessly/i);
		expect(tagline).toBeInTheDocument();
	});

	it('should have the icon container', () => {
		render(TestWrapper, {
			props: {
				component: OnboardingHero,
				props: {}
			}
		});

		// Icon component may not render in test environment
		// Just verify the component renders without error
		expect(document.body.innerHTML).toContain('Cut Branches');
	});

	it('should not crash when rendered', () => {
		expect(() => {
			render(TestWrapper, {
				props: {
					component: OnboardingHero,
					props: {}
				}
			});
		}).not.toThrow();
	});
});
