import { createRawSnippet } from 'svelte';
import { describe, it, expect } from 'vitest';
import OnboardingCta from '../onboarding-cta.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const actionButton = createRawSnippet(() => ({
	render: () => '<button type="button">Add Repository</button>'
}));

describe('OnboardingCta', () => {
	describe('Rendering', () => {
		it('should render the component', () => {
			renderWithTestWrapper(OnboardingCta, { actionButton });
			expect(document.body.innerHTML).not.toBe('');
		});

		it('should display the call-to-action text', () => {
			const screen = renderWithTestWrapper(OnboardingCta, { actionButton });
			expect(
				screen.getByText(/get started by adding your first git repository/i)
			).toBeInTheDocument();
		});

		it('should render the action button snippet', () => {
			const screen = renderWithTestWrapper(OnboardingCta, { actionButton });
			expect(screen.getByRole('button', { name: /add repository/i })).toBeInTheDocument();
		});

		it('should display feature highlights', () => {
			const screen = renderWithTestWrapper(OnboardingCta, { actionButton });
			expect(screen.getByText(/clean with confidence/i)).toBeInTheDocument();
			expect(screen.getByText(/track & restore/i)).toBeInTheDocument();
			expect(screen.getByText(/bulk operations/i)).toBeInTheDocument();
		});
	});
});
