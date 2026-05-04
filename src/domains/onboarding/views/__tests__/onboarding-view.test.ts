import { createRawSnippet } from 'svelte';
import { describe, it, expect, beforeEach } from 'vitest';
import OnboardingView from '../onboarding-view.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const actionButton = createRawSnippet(() => ({
	render: () => '<button type="button">Add Repository</button>'
}));

describe('OnboardingView', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	it('should render the component', () => {
		const screen = renderWithTestWrapper(OnboardingView, { actionButton });

		expect(screen.container.innerHTML).not.toBe('');
	});

	it('should render the OnboardingHero component', () => {
		const screen = renderWithTestWrapper(OnboardingView, { actionButton });

		const title = screen.getByRole('heading', { name: /cut branches/i });
		expect(title).toBeInTheDocument();
	});

	it('should render the OnboardingCta with the provided action button', () => {
		const screen = renderWithTestWrapper(OnboardingView, { actionButton });

		const button = screen.getByRole('button', { name: /add repository/i });
		expect(button).toBeInTheDocument();
	});

	it('should display the tagline from hero', () => {
		const screen = renderWithTestWrapper(OnboardingView, { actionButton });

		const tagline = screen.getByText(/manage and clean up your git branches effortlessly/i);
		expect(tagline).toBeInTheDocument();
	});

	it('should display the CTA text', () => {
		const screen = renderWithTestWrapper(OnboardingView, { actionButton });

		const ctaText = screen.getByText(/get started by adding your first git repository/i);
		expect(ctaText).toBeInTheDocument();
	});

	it('should not crash when rendered', () => {
		expect(() => {
			renderWithTestWrapper(OnboardingView, { actionButton });
		}).not.toThrow();
	});
});
