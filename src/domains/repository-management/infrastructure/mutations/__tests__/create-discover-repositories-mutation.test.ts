import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDiscoverRepositoriesMutation } from '../create-discover-repositories-mutation';
import { createTauriMutation } from '$infrastructure/create-tauri-mutation';

const { mockCreateTauriMutation } = vi.hoisted(() => ({
	mockCreateTauriMutation: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn() }))
}));

vi.mock('$infrastructure/create-tauri-mutation', () => ({
	createTauriMutation: mockCreateTauriMutation
}));

describe('createDiscoverRepositoriesMutation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('delegates to createTauriMutation with the discoverRepositories command', () => {
		createDiscoverRepositoriesMutation();

		expect(createTauriMutation).toHaveBeenCalledWith('discoverRepositories', undefined);
	});

	it('forwards provided options', () => {
		const options = { meta: { showErrorNotification: true } };
		createDiscoverRepositoriesMutation(options);

		expect(createTauriMutation).toHaveBeenCalledWith('discoverRepositories', options);
	});
});
