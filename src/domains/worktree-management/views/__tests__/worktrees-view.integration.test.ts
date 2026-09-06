import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorktreesView from '../worktrees-view.svelte';
import type { Worktree as WorktreeData } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

// Exercise the REAL composable + query wiring; only the Tauri boundary is mocked.
const { executeCommand } = vi.hoisted(() => ({ executeCommand: vi.fn() }));
vi.mock('$infrastructure/tauri-commands', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$infrastructure/tauri-commands')>();
	return {
		...actual,
		executeCommand,
		buildCommandExecutor: (name: string) => (input: unknown) => executeCommand(name, input)
	};
});
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn().mockResolvedValue(() => {}) }));

function wtData(name: string, isMain = false): WorktreeData {
	return {
		name,
		path: `/repos/${name}`,
		branch: name,
		headSha: 'abc1234',
		isLocked: false,
		lockReason: null,
		isMain,
		isPrunable: false
	};
}

beforeEach(() => {
	executeCommand.mockReset();
	executeCommand.mockImplementation((command: string) => {
		if (command === 'getRepository') {
			return Promise.resolve({ id: 'r1', name: 'repo', path: '/repos/main' });
		}
		if (command === 'listWorktrees') {
			return Promise.resolve({
				worktrees: [wtData('main', true), ...Array.from({ length: 9 }, (_, i) => wtData(`wt${i}`))]
			});
		}
		return Promise.reject(new Error(`unexpected command: ${command}`));
	});
});

describe('WorktreesView (integration)', () => {
	it('resolves the path, loads worktrees, and lists them', async () => {
		const screen = await renderWithTestWrapper(WorktreesView, { id: 'r1' });

		await vi.waitFor(async () => {
			await tick();
			expect(screen.container.querySelectorAll('[data-testid="worktree-row"]')).toHaveLength(10);
		});

		expect(screen.container.querySelector('[data-testid="worktree-list-loading"]')).toBeNull();
		// 9 linked worktrees are selectable (the main worktree is not).
		await expect
			.element(screen.getByTestId('worktrees-selection-count'))
			.toMatchTextContent('0 of 9');
		expect(executeCommand).toHaveBeenCalledWith('listWorktrees', { path: '/repos/main' });
	});
});
