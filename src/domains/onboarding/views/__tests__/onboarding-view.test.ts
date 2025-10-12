import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, beforeEach } from 'vitest';
import OnboardingView from '../onboarding-view.svelte';
import TestWrapper from '$components/test-wrapper.svelte';

describe('OnboardingView', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('should render the component', () => {
		render(TestWrapper, {
			props: {
				component: OnboardingView,
				props: {}
			}
		});

		expect(document.body.innerHTML).not.toBe('');
	});

	it('should render the OnboardingHero component', () => {
		render(TestWrapper, {
			props: {
				component: OnboardingView,
				props: {}
			}
		});

		const title = screen.getByRole('heading', { name: /cut branches/i });
		expect(title).toBeInTheDocument();
	});

	it('should render the OnboardingCta component', () => {
		render(TestWrapper, {
			props: {
				component: OnboardingView,
				props: {}
			}
		});

		const button = screen.getByRole('button', { name: /add repository/i });
		expect(button).toBeInTheDocument();
	});

	it('should display the tagline from hero', () => {
		render(TestWrapper, {
			props: {
				component: OnboardingView,
				props: {}
			}
		});

		const tagline = screen.getByText(/manage and clean up your git branches effortlessly/i);
		expect(tagline).toBeInTheDocument();
	});

	it('should display the CTA text', () => {
		render(TestWrapper, {
			props: {
				component: OnboardingView,
				props: {}
			}
		});

		const ctaText = screen.getByText(/get started by adding your first git repository/i);
		expect(ctaText).toBeInTheDocument();
	});

	it('should not crash when rendered', () => {
		expect(() => {
			render(TestWrapper, {
				props: {
					component: OnboardingView,
					props: {}
				}
			});
		}).not.toThrow();
	});
});
