import { tick } from 'svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CleanRepositoryModal from '../clean-repository-modal.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const h = vi.hoisted(() => ({
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	stub: undefined as any
}));

vi.mock('$domains/repository-cleanup/core/composables/use-cleanup-targets.svelte', () => ({
	useCleanupTargets: vi.fn(() => h.stub)
}));

vi.mock('$domains/repository-cleanup/core/composables/use-cleanup-config.svelte', () => ({
	getCleanupConfig: () => ({ defaultDeletionMode: 'trash' })
}));

vi.mock('$infrastructure/queries/create-get-repository-query', () => ({
	createGetRepositoryQuery: vi.fn(() => ({
		get data() {
			return { id: 'r1', name: 'repo-1', path: '/r1' };
		}
	}))
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeStub(overrides: Record<string, any> = {}) {
	return {
		targets: [],
		hasScanned: true,
		isScanning: false,
		isCleaning: false,
		progress: null,
		selectedCount: 0,
		selectedBytes: 0,
		totalBytes: 0,
		targetCount: 0,
		isSelected: vi.fn(() => false),
		scan: vi.fn(() => Promise.resolve()),
		toggle: vi.fn(),
		setAll: vi.fn(),
		clean: vi.fn(() => Promise.resolve()),
		...overrides
	};
}

// The validation hint renders inside a native <dialog> that is always present;
// its visibility is the dialog's own open state. Find the open one.
function openHint(): HTMLDialogElement | undefined {
	return [...document.querySelectorAll('dialog[data-popover]')].find(
		(el) => (el as HTMLDialogElement).open
	) as HTMLDialogElement | undefined;
}

beforeEach(() => {
	vi.clearAllMocks();
	h.stub = makeStub();
});

describe('CleanRepositoryModal', () => {
	it('keeps the confirm button enabled and cleans when folders are selected', async () => {
		h.stub = makeStub({ selectedCount: 2, targetCount: 2, selectedBytes: 2048 });
		const screen = renderWithTestWrapper(CleanRepositoryModal, { open: true, repositoryId: 'r1' });
		await tick();

		const confirm = screen.getByTestId('cleanup-confirm');
		expect(confirm).not.toBeDisabled();
		await confirm.click();

		await vi.waitFor(() => expect(h.stub.clean).toHaveBeenCalledWith('r1', '/r1', 'trash'));
	});

	it('shows a validation hint and does not clean when nothing is selected', async () => {
		h.stub = makeStub({ selectedCount: 0, targetCount: 0 });
		const screen = renderWithTestWrapper(CleanRepositoryModal, { open: true, repositoryId: 'r1' });
		await tick();

		await screen.getByTestId('cleanup-confirm').click();

		await vi.waitFor(() => expect(openHint()).toBeTruthy());
		expect(openHint()?.textContent).toContain('Select at least one folder to clean.');
		expect(h.stub.clean).not.toHaveBeenCalled();
	});

	it('requires typing "delete" in permanent mode before cleaning', async () => {
		h.stub = makeStub({ selectedCount: 2, targetCount: 2, selectedBytes: 1024 });
		const screen = renderWithTestWrapper(CleanRepositoryModal, { open: true, repositoryId: 'r1' });
		await tick();

		// Switch to permanent deletion — this surfaces the typed-confirm requirement.
		await screen.getByTestId('cleanup-mode-permanent').click();
		await tick();

		await screen.getByTestId('cleanup-confirm').click();
		await vi.waitFor(() => expect(openHint()).toBeTruthy());
		expect(openHint()?.textContent).toContain('Type “delete” to confirm permanent deletion.');
		expect(h.stub.clean).not.toHaveBeenCalled();

		// Typing the confirmation word clears the hint and allows the clean.
		await screen.getByTestId('cleanup-confirm-input').fill('delete');
		await screen.getByTestId('cleanup-confirm').click();

		await vi.waitFor(() => expect(h.stub.clean).toHaveBeenCalledWith('r1', '/r1', 'permanent'));
	});
});
