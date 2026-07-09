import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorktreeActions } from '../use-worktree-actions.svelte';

const { removeAsync, lockAsync, unlockAsync, push } = vi.hoisted(() => ({
	removeAsync: vi.fn(),
	lockAsync: vi.fn(),
	unlockAsync: vi.fn(),
	push: vi.fn()
}));

vi.mock('../../../infrastructure/mutations/create-remove-worktree-mutation', () => ({
	createRemoveWorktreeMutation: () => ({ mutateAsync: removeAsync, isPending: false })
}));
vi.mock('../../../infrastructure/mutations/create-lock-worktree-mutation', () => ({
	createLockWorktreeMutation: () => ({ mutateAsync: lockAsync, isPending: false }),
	createUnlockWorktreeMutation: () => ({ mutateAsync: unlockAsync, isPending: false })
}));
vi.mock('$services/notifications/notifications.svelte', () => ({ notifications: { push } }));

function makeActions() {
	return useWorktreeActions({ getPath: () => '/repo' });
}

beforeEach(() => {
	removeAsync.mockReset();
	lockAsync.mockReset();
	unlockAsync.mockReset();
	push.mockReset();
});

describe('useWorktreeActions', () => {
	it('exposes pending flags', () => {
		const actions = makeActions();
		expect(actions.isRemoving).toBe(false);
		expect(actions.isLocking).toBe(false);
		expect(actions.isUnlocking).toBe(false);
	});

	it('removes a worktree and reports success', async () => {
		removeAsync.mockResolvedValue({ name: 'a' });
		await makeActions().remove('a', true);
		expect(removeAsync).toHaveBeenCalledWith({ path: '/repo', name: 'a', force: true });
		expect(push).toHaveBeenCalledWith(expect.objectContaining({ feedback: 'success' }));
	});

	it('defaults force to false when removing', async () => {
		removeAsync.mockResolvedValue({ name: 'a' });
		await makeActions().remove('a');
		expect(removeAsync).toHaveBeenCalledWith({ path: '/repo', name: 'a', force: false });
	});

	it('rethrows and warns when a remove fails', async () => {
		removeAsync.mockRejectedValue(new Error('locked'));
		await expect(makeActions().remove('a')).rejects.toThrow('locked');
		expect(push).toHaveBeenCalledWith(
			expect.objectContaining({ feedback: 'danger', message: 'locked' })
		);
	});

	it('falls back to a stringified error when it has no message', async () => {
		removeAsync.mockRejectedValue('weird');
		await expect(makeActions().remove('a')).rejects.toBe('weird');
		expect(push).toHaveBeenCalledWith(expect.objectContaining({ message: 'weird' }));
	});

	it('locks with a reason and reports success', async () => {
		lockAsync.mockResolvedValue({ name: 'a' });
		await makeActions().lock('a', 'busy');
		expect(lockAsync).toHaveBeenCalledWith({ path: '/repo', name: 'a', reason: 'busy' });
		expect(push).toHaveBeenCalledWith(expect.objectContaining({ feedback: 'success' }));
	});

	it('locks without a reason, passing null', async () => {
		lockAsync.mockResolvedValue({ name: 'a' });
		await makeActions().lock('a');
		expect(lockAsync).toHaveBeenCalledWith({ path: '/repo', name: 'a', reason: null });
	});

	it('warns when a lock fails without rethrowing', async () => {
		lockAsync.mockRejectedValue(new Error('nope'));
		await expect(makeActions().lock('a')).resolves.toBeUndefined();
		expect(push).toHaveBeenCalledWith(expect.objectContaining({ feedback: 'danger' }));
	});

	it('unlocks and reports success', async () => {
		unlockAsync.mockResolvedValue({ name: 'a' });
		await makeActions().unlock('a');
		expect(unlockAsync).toHaveBeenCalledWith({ path: '/repo', name: 'a' });
		expect(push).toHaveBeenCalledWith(expect.objectContaining({ feedback: 'success' }));
	});

	it('warns when an unlock fails without rethrowing', async () => {
		unlockAsync.mockRejectedValue(new Error('nope'));
		await expect(makeActions().unlock('a')).resolves.toBeUndefined();
		expect(push).toHaveBeenCalledWith(expect.objectContaining({ feedback: 'danger' }));
	});
});
