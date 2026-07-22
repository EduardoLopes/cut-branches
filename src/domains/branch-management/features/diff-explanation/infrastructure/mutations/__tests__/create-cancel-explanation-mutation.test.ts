import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCancelExplanationMutation } from '../create-cancel-explanation-mutation';
import { createTauriMutation } from '$infrastructure/create-tauri-mutation';

const { mockCreateTauriMutation } = vi.hoisted(() => ({
	mockCreateTauriMutation: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn() }))
}));

vi.mock('$infrastructure/create-tauri-mutation', () => ({
	createTauriMutation: mockCreateTauriMutation
}));

describe('createCancelExplanationMutation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('delegates to createTauriMutation with the cancelExplanation command', () => {
		createCancelExplanationMutation();
		expect(createTauriMutation).toHaveBeenCalledWith('cancelExplanation', {});
	});

	it('forwards provided options', () => {
		createCancelExplanationMutation({ meta: { showErrorNotification: true } });
		expect(createTauriMutation).toHaveBeenCalledWith('cancelExplanation', {
			meta: { showErrorNotification: true }
		});
	});
});
