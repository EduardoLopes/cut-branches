import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFileExplanationMutation } from '../create-file-explanation-mutation';
import { createTauriMutation } from '$infrastructure/create-tauri-mutation';

const { mockCreateTauriMutation } = vi.hoisted(() => ({
	mockCreateTauriMutation: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn() }))
}));

vi.mock('$infrastructure/create-tauri-mutation', () => ({
	createTauriMutation: mockCreateTauriMutation
}));

describe('createFileExplanationMutation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('delegates to createTauriMutation with the createFileExplanation command', () => {
		createFileExplanationMutation();
		expect(createTauriMutation).toHaveBeenCalledWith('createFileExplanation', {});
	});

	it('forwards provided options', () => {
		createFileExplanationMutation({ meta: { showErrorNotification: true } });
		expect(createTauriMutation).toHaveBeenCalledWith('createFileExplanation', {
			meta: { showErrorNotification: true }
		});
	});
});
