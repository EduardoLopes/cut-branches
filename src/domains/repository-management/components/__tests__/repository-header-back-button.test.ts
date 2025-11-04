import { tick } from 'svelte';
import { vi } from 'vitest';
import BackButton from '../back-button.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

// Mock the navigation module
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('BackButton', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	test('should render the button', () => {
		const { getByTestId } = renderWithTestWrapper(BackButton, {
			repositoryId: 'test-repo-id'
		});

		expect(getByTestId('back-button')).toBeInTheDocument();
	});

	test('should navigate back when clicked', async () => {
		const { goto } = await import('$app/navigation');
		const repositoryId = 'test-repo-id';

		const { getByTestId } = renderWithTestWrapper(BackButton, {
			repositoryId
		});

		await tick();

		const button = getByTestId('back-button');
		await button.click();

		expect(goto).toHaveBeenCalledWith(`/repos/${repositoryId}`);
	});

	test('should have correct accessibility attributes', () => {
		const { getByTestId } = renderWithTestWrapper(BackButton, {
			repositoryId: 'test-repo-id'
		});

		const button = getByTestId('back-button');
		expect(button).toBeInTheDocument();

		// Check that the "Back" text is present (even if visually hidden)
		expect(button.element().textContent).toContain('Back');
	});
});
