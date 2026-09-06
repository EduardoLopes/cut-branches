import { describe, test, expect, vi } from 'vitest';
import RestoreConflictPrompt from '../restore-conflict-prompt.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

describe('RestoreConflictPrompt', () => {
	test('renders the branch name in the prompt', async () => {
		const screen = await renderWithTestWrapper(RestoreConflictPrompt, {
			branchName: 'feature-x',
			onOverwrite: vi.fn(),
			onSkip: vi.fn()
		});
		expect(screen.getByText('feature-x')).toBeInTheDocument();
	});

	test('clicking Overwrite calls onOverwrite', async () => {
		const onOverwrite = vi.fn();
		const screen = await renderWithTestWrapper(RestoreConflictPrompt, {
			branchName: 'feature-x',
			onOverwrite,
			onSkip: vi.fn()
		});
		await screen.getByTestId('overwrite-button').click();
		expect(onOverwrite).toHaveBeenCalledOnce();
	});

	test('clicking Skip calls onSkip', async () => {
		const onSkip = vi.fn();
		const screen = await renderWithTestWrapper(RestoreConflictPrompt, {
			branchName: 'feature-x',
			onOverwrite: vi.fn(),
			onSkip
		});
		await screen.getByTestId('skip-button').click();
		expect(onSkip).toHaveBeenCalledOnce();
	});
});
