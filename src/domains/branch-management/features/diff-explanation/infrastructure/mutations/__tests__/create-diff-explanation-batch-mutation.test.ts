import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDiffExplanationBatchMutation } from '../create-diff-explanation-batch-mutation';
import { createTauriMutation } from '$infrastructure/create-tauri-mutation';

const { mockCreateTauriMutation } = vi.hoisted(() => ({
	mockCreateTauriMutation: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn() }))
}));

vi.mock('$infrastructure/create-tauri-mutation', () => ({
	createTauriMutation: mockCreateTauriMutation
}));

describe('createDiffExplanationBatchMutation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('delegates to createTauriMutation with the createDiffExplanationBatch command', () => {
		createDiffExplanationBatchMutation();
		expect(createTauriMutation).toHaveBeenCalledWith('createDiffExplanationBatch', {});
	});

	it('forwards provided options', () => {
		createDiffExplanationBatchMutation({ meta: { showErrorNotification: true } });
		expect(createTauriMutation).toHaveBeenCalledWith('createDiffExplanationBatch', {
			meta: { showErrorNotification: true }
		});
	});
});
