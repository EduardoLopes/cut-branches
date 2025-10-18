import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { vi } from 'vitest';
import RestoreRepositoryButton from '../restore-repository-button.svelte';
import TestWrapper from '$components/test-wrapper.svelte';

// Mock the navigation module
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('RestoreRepositoryButton', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	test('should render the button', () => {
		const { getByTestId } = render(TestWrapper, {
			props: {
				component: RestoreRepositoryButton,
				props: {
					repositoryId: 'test-repo-id'
				}
			}
		});

		expect(getByTestId('restore-navigate-button')).toBeInTheDocument();
	});

	test('should navigate to restore page when clicked', async () => {
		const { goto } = await import('$app/navigation');
		const repositoryId = 'test-repo-id';

		const { getByTestId } = render(TestWrapper, {
			props: {
				component: RestoreRepositoryButton,
				props: {
					repositoryId
				}
			}
		});

		await tick();

		const button = getByTestId('restore-navigate-button');
		await fireEvent.click(button);

		expect(goto).toHaveBeenCalledWith(`/repos/${repositoryId}/restore`);
	});

	test('should display "Restore" text', () => {
		const { getByTestId } = render(TestWrapper, {
			props: {
				component: RestoreRepositoryButton,
				props: {
					repositoryId: 'test-repo-id'
				}
			}
		});

		const button = getByTestId('restore-navigate-button');
		expect(button.textContent).toContain('Restore');
	});
});
