import { tick } from 'svelte';
import { vi } from 'vitest';
import RestoreRepositoryButton from '../restore-repository-button.svelte';
import * as navigation from '$app/navigation';
import { renderWithTestWrapper, mockDataFactory } from '$utils/test-utils';

vi.mock('$lib/bindings', () => ({
	commands: {
		getBranchList: vi.fn(() =>
			Promise.resolve({
				status: 'ok' as const,
				data: {
					branches: [
						mockDataFactory.branch({
							name: 'deleted-branch-1',
							deletedAt: '2024-01-01T00:00:00Z'
						}),
						mockDataFactory.branch({
							name: 'deleted-branch-2',
							deletedAt: '2024-01-02T00:00:00Z'
						})
					]
				}
			})
		)
	}
}));

// Mock the navigation module
vi.mock('$app/navigation', { spy: true });

vi.mocked(navigation.goto).mockResolvedValue(undefined);

describe('RestoreRepositoryButton', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	test('should render the button', () => {
		const { getByTestId } = renderWithTestWrapper(RestoreRepositoryButton, {
			repositoryId: 'test-repo-id'
		});

		expect(getByTestId('restore-navigate-button')).toBeInTheDocument();
	});

	test('should navigate to restore page when clicked', async () => {
		const repositoryId = 'test-repo-id';

		const { getByTestId } = renderWithTestWrapper(RestoreRepositoryButton, {
			repositoryId
		});

		const button = getByTestId('restore-navigate-button');
		await button.click();

		await tick();

		await vi.waitFor(() => {
			expect(navigation.goto).toHaveBeenCalledWith(`/repos/${repositoryId}/restore`);
		});
	});

	test('should display "Restore" text', () => {
		const { getByTestId } = renderWithTestWrapper(RestoreRepositoryButton, {
			repositoryId: 'test-repo-id'
		});

		const button = getByTestId('restore-navigate-button');
		expect(button).toHaveTextContent('Restore');
	});
});
