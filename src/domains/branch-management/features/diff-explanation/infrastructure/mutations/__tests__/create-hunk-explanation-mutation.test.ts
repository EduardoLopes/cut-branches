import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHunkExplanationMutation } from '../create-hunk-explanation-mutation';
import { createTauriMutation } from '$infrastructure/create-tauri-mutation';

const { mockCreateTauriMutation } = vi.hoisted(() => ({
	mockCreateTauriMutation: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn() }))
}));

vi.mock('$infrastructure/create-tauri-mutation', () => ({
	createTauriMutation: mockCreateTauriMutation
}));

describe('createHunkExplanationMutation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('delegates to createTauriMutation with the createHunkExplanation command', () => {
		createHunkExplanationMutation();
		expect(createTauriMutation).toHaveBeenCalledWith('createHunkExplanation', {});
	});

	it('forwards provided options', () => {
		createHunkExplanationMutation({ meta: { showErrorNotification: true } });
		expect(createTauriMutation).toHaveBeenCalledWith('createHunkExplanation', {
			meta: { showErrorNotification: true }
		});
	});
});
