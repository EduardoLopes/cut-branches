import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { vi } from 'vitest';
import RepositoryHeaderBackButton from '../repository-header-back-button.svelte';
import TestWrapper from '$components/test-wrapper.svelte';

// Mock the navigation module
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('RepositoryHeaderBackButton', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	test('should render the button', () => {
		const { getByTestId } = render(TestWrapper, {
			props: {
				component: RepositoryHeaderBackButton,
				props: {
					repositoryId: 'test-repo-id'
				}
			}
		});

		expect(getByTestId('back-button')).toBeInTheDocument();
	});

	test('should navigate back when clicked', async () => {
		const { goto } = await import('$app/navigation');
		const repositoryId = 'test-repo-id';

		const { getByTestId } = render(TestWrapper, {
			props: {
				component: RepositoryHeaderBackButton,
				props: {
					repositoryId
				}
			}
		});

		await tick();

		const button = getByTestId('back-button');
		await fireEvent.click(button);

		expect(goto).toHaveBeenCalledWith(`/repos/${repositoryId}`);
	});

	test('should have correct accessibility attributes', () => {
		const { getByTestId } = render(TestWrapper, {
			props: {
				component: RepositoryHeaderBackButton,
				props: {
					repositoryId: 'test-repo-id'
				}
			}
		});

		const button = getByTestId('back-button');
		expect(button).toBeInTheDocument();

		// Check that the "Back" text is present (even if visually hidden)
		expect(button.textContent).toContain('Back');
	});
});
