import { flushSync } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAddWorktreeFlow } from '../use-add-worktree-flow.svelte';
import { withEffectRoot } from '$lib/with-effect-root.svelte';

const { openDialog, addAsync, push } = vi.hoisted(() => ({
	openDialog: vi.fn(),
	addAsync: vi.fn(),
	push: vi.fn()
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: openDialog }));
vi.mock('../../../infrastructure/mutations/create-add-worktree-mutation', () => ({
	createAddWorktreeMutation: () => ({ mutateAsync: addAsync, isPending: false })
}));
vi.mock('$services/notifications/notifications.svelte', () => ({ notifications: { push } }));

function setup() {
	return withEffectRoot(() => useAddWorktreeFlow({ getPath: () => '/repo' }));
}

beforeEach(() => {
	openDialog.mockReset();
	addAsync.mockReset();
	push.mockReset();
});

describe('useAddWorktreeFlow', () => {
	it('picks a directory and stores it', async () => {
		openDialog.mockResolvedValue('/chosen');
		const { value: flow, cleanup } = setup();
		await flow.pickDirectory();
		flushSync();
		expect(flow.selectedParent).toBe('/chosen');
		cleanup();
	});

	it('ignores a cancelled directory pick', async () => {
		openDialog.mockResolvedValue(null);
		const { value: flow, cleanup } = setup();
		await flow.pickDirectory();
		flushSync();
		expect(flow.selectedParent).toBeNull();
		cleanup();
	});

	it('warns when the directory picker throws', async () => {
		openDialog.mockRejectedValue(new Error('denied'));
		const { value: flow, cleanup } = setup();
		await flow.pickDirectory();
		flushSync();
		expect(push).toHaveBeenCalledWith(
			expect.objectContaining({ feedback: 'danger', message: 'denied' })
		);
		cleanup();
	});

	it('does not add without a chosen directory', async () => {
		const { value: flow, cleanup } = setup();
		expect(await flow.add({ name: 'x' })).toBe(false);
		expect(addAsync).not.toHaveBeenCalled();
		cleanup();
	});

	it('does not add with an empty name', async () => {
		openDialog.mockResolvedValue('/chosen');
		const { value: flow, cleanup } = setup();
		await flow.pickDirectory();
		flushSync();
		expect(await flow.add({ name: '   ' })).toBe(false);
		expect(addAsync).not.toHaveBeenCalled();
		cleanup();
	});

	it('creates a worktree, trims inputs, joins the path, and resets', async () => {
		openDialog.mockResolvedValue('/chosen/');
		addAsync.mockResolvedValue({ worktree: {} });
		const { value: flow, cleanup } = setup();
		await flow.pickDirectory();
		flushSync();

		const ok = await flow.add({ name: ' hotfix ', reference: ' feature ', lock: true });
		flushSync();

		expect(addAsync).toHaveBeenCalledWith({
			path: '/repo',
			name: 'hotfix',
			worktreePath: '/chosen/hotfix',
			reference: 'feature',
			lock: true
		});
		expect(ok).toBe(true);
		expect(flow.selectedParent).toBeNull();
		expect(push).toHaveBeenCalledWith(expect.objectContaining({ feedback: 'success' }));
		cleanup();
	});

	it('passes a null reference and default lock when omitted', async () => {
		openDialog.mockResolvedValue('/chosen');
		addAsync.mockResolvedValue({ worktree: {} });
		const { value: flow, cleanup } = setup();
		await flow.pickDirectory();
		flushSync();

		await flow.add({ name: 'x', reference: '' });
		expect(addAsync).toHaveBeenCalledWith(
			expect.objectContaining({ reference: null, lock: false })
		);
		cleanup();
	});

	it('returns false and keeps the directory when the add fails', async () => {
		openDialog.mockResolvedValue('/chosen');
		addAsync.mockRejectedValue(new Error('already exists'));
		const { value: flow, cleanup } = setup();
		await flow.pickDirectory();
		flushSync();

		const ok = await flow.add({ name: 'x' });
		flushSync();

		expect(ok).toBe(false);
		expect(push).toHaveBeenCalledWith(
			expect.objectContaining({ feedback: 'danger', message: 'already exists' })
		);
		expect(flow.selectedParent).toBe('/chosen');
		cleanup();
	});

	it('resets the chosen directory', async () => {
		openDialog.mockResolvedValue('/chosen');
		const { value: flow, cleanup } = setup();
		await flow.pickDirectory();
		flushSync();
		flow.reset();
		flushSync();
		expect(flow.selectedParent).toBeNull();
		cleanup();
	});
});
