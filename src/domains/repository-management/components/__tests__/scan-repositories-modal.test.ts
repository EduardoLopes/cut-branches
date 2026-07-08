import { open as openFolderDialog } from '@tauri-apps/plugin-dialog';
import { tick } from 'svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ScanRepositoriesModal from '../scan-repositories-modal.svelte';
import { notifications } from '$services/notifications/notifications.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));

const h = vi.hoisted(() => ({
	push: vi.fn(),
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	stub: undefined as any,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onAdded: undefined as any
}));

vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: { push: h.push }
}));

vi.mock('../../core/composables/use-discover-repositories.svelte', () => ({
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	useDiscoverRepositories: vi.fn((options: any) => {
		h.onAdded = options?.onAdded;
		return h.stub;
	})
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeStub(overrides: Record<string, any> = {}) {
	return {
		results: [],
		scannedRoots: [],
		hasScanned: false,
		isScanning: false,
		progress: null,
		isAdding: false,
		selectedCount: 0,
		addableCount: 0,
		isSelected: vi.fn(() => false),
		scan: vi.fn(() => Promise.resolve()),
		toggle: vi.fn(),
		setAll: vi.fn(),
		addSelected: vi.fn(),
		...overrides
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	h.stub = makeStub();
	vi.mocked(openFolderDialog).mockResolvedValue('/chosen/folder');
});

describe('ScanRepositoriesModal', () => {
	describe('auto-scan on open', () => {
		it('scans the home folder when opened with the home scope', async () => {
			renderWithTestWrapper(ScanRepositoriesModal, { open: true, scope: 'home' });
			await tick();

			expect(h.stub.scan).toHaveBeenCalledWith([]);
			expect(openFolderDialog).not.toHaveBeenCalled();
		});

		it('prompts for a folder when opened with the folder scope', async () => {
			renderWithTestWrapper(ScanRepositoriesModal, { open: true, scope: 'folder' });

			await vi.waitFor(() => expect(h.stub.scan).toHaveBeenCalledWith(['/chosen/folder']));
			expect(openFolderDialog).toHaveBeenCalledWith({ directory: true, multiple: false });
		});

		it('does not scan when the folder picker is cancelled', async () => {
			vi.mocked(openFolderDialog).mockResolvedValue(null);

			renderWithTestWrapper(ScanRepositoriesModal, { open: true, scope: 'folder' });

			await vi.waitFor(() => expect(openFolderDialog).toHaveBeenCalled());
			expect(h.stub.scan).not.toHaveBeenCalled();
		});

		it('notifies when the folder picker fails', async () => {
			vi.mocked(openFolderDialog).mockRejectedValue(new Error('kaboom'));

			renderWithTestWrapper(ScanRepositoriesModal, { open: true, scope: 'folder' });

			await vi.waitFor(() =>
				expect(notifications.push).toHaveBeenCalledWith({
					title: 'Error',
					message: 'kaboom',
					feedback: 'danger'
				})
			);
		});

		it('does not scan while closed', async () => {
			renderWithTestWrapper(ScanRepositoriesModal, { open: false, scope: 'home' });
			await tick();

			expect(h.stub.scan).not.toHaveBeenCalled();
		});
	});

	describe('rendering states', () => {
		it('shows the scanning indicator while a scan runs', async () => {
			h.stub = makeStub({ isScanning: true });
			const screen = renderWithTestWrapper(ScanRepositoriesModal, { open: true });
			await tick();

			expect(screen.getByTestId('scan-loading')).toBeInTheDocument();
		});

		it('shows an empty state when a scan finds nothing', async () => {
			h.stub = makeStub({ hasScanned: true, results: [] });
			const screen = renderWithTestWrapper(ScanRepositoriesModal, { open: true });

			// The spinner holds for a minimum duration; wait for it to settle.
			await vi.waitFor(() => expect(screen.getByTestId('scan-empty')).toBeInTheDocument());
		});

		it('lists results with a select-all control and an added marker', async () => {
			h.stub = makeStub({
				results: [
					{ path: '/a', name: 'a', alreadyAdded: false },
					{ path: '/b', name: 'b', alreadyAdded: true }
				],
				addableCount: 1,
				selectedCount: 1,
				isSelected: vi.fn((p: string) => p === '/a')
			});
			const screen = renderWithTestWrapper(ScanRepositoriesModal, { open: true });

			await vi.waitFor(() => expect(screen.getByTestId('scan-select-all')).toBeInTheDocument());
			expect(screen.getByTestId('scan-item').elements()).toHaveLength(2);
			expect(screen.getByTestId('scan-item-added')).toBeInTheDocument();
			expect(screen.getByTestId('scan-add-selected')).toHaveTextContent('Add 1 repository');
		});

		it('filters the results and shows a no-match state', async () => {
			h.stub = makeStub({
				results: [
					{ path: '/alpha', name: 'alpha', alreadyAdded: false },
					{ path: '/beta', name: 'beta', alreadyAdded: false }
				],
				addableCount: 2,
				selectedCount: 2
			});
			const screen = renderWithTestWrapper(ScanRepositoriesModal, { open: true });

			await vi.waitFor(() => expect(screen.getByTestId('scan-item').elements()).toHaveLength(2));

			await screen.getByPlaceholder('Filter results').fill('alpha');
			await vi.waitFor(() => expect(screen.getByTestId('scan-item').elements()).toHaveLength(1));

			await screen.getByPlaceholder('Filter results').fill('nope');
			await vi.waitFor(() => expect(screen.getByTestId('scan-no-matches')).toBeInTheDocument());
		});

		it('pluralizes the add button and shows adding state', async () => {
			h.stub = makeStub({
				results: [{ path: '/a', name: 'a', alreadyAdded: false }],
				addableCount: 2,
				selectedCount: 2,
				isAdding: true
			});
			const screen = renderWithTestWrapper(ScanRepositoriesModal, { open: true });
			await tick();

			expect(screen.getByTestId('scan-add-selected')).toHaveTextContent('Adding…');
		});
	});

	describe('interactions', () => {
		beforeEach(() => {
			h.stub = makeStub({
				results: [{ path: '/a', name: 'a', alreadyAdded: false }],
				addableCount: 1,
				selectedCount: 1
			});
		});

		it('re-scans the home folder from the Home folder menu option', async () => {
			const screen = renderWithTestWrapper(ScanRepositoriesModal, { open: true });
			// Let the initial auto-scan settle so the split-button menu is enabled.
			await vi.waitFor(() => expect(screen.getByTestId('scan-item').elements().length).toBe(1));
			h.stub.scan.mockClear();

			await screen.getByTestId('scan-location-menu-trigger').click();
			await tick();
			await screen
				.getByRole('menuitem', { name: /home folder/i })
				.first()
				.click();

			await vi.waitFor(() => expect(h.stub.scan).toHaveBeenCalledWith([]));
		});

		it('scans a chosen folder from the Choose folder button', async () => {
			const screen = renderWithTestWrapper(ScanRepositoriesModal, { open: true });
			await tick();
			h.stub.scan.mockClear();

			await screen.getByTestId('choose-folder-button').click();

			await vi.waitFor(() => expect(h.stub.scan).toHaveBeenCalledWith(['/chosen/folder']));
			expect(openFolderDialog).toHaveBeenCalled();
		});

		it('toggles a result and toggles select-all', async () => {
			const screen = renderWithTestWrapper(ScanRepositoriesModal, { open: true });
			await tick();

			await screen.getByTestId('scan-item').click();
			expect(h.stub.toggle).toHaveBeenCalledWith('/a');

			await screen.getByTestId('scan-select-all').click();
			expect(h.stub.setAll).toHaveBeenCalled();
		});

		it('adds the selected repositories', async () => {
			const screen = renderWithTestWrapper(ScanRepositoriesModal, { open: true });
			await tick();

			await screen.getByTestId('scan-add-selected').click();
			expect(h.stub.addSelected).toHaveBeenCalled();
		});

		it('closes from the Close button', async () => {
			const screen = renderWithTestWrapper(ScanRepositoriesModal, { open: true });
			await tick();

			await screen.getByTestId('scan-cancel').click();

			const modal = document.querySelector(
				'[data-testid="scan-repositories-modal"]'
			) as HTMLElement | null;
			await expect.element(modal).not.toHaveAttribute('open');
		});
	});

	describe('onAdded callback', () => {
		it('closes the modal when nothing is left to add', async () => {
			h.stub = makeStub({ addableCount: 0 });
			renderWithTestWrapper(ScanRepositoriesModal, { open: true });
			await tick();

			h.onAdded(1);

			const modal = document.querySelector(
				'[data-testid="scan-repositories-modal"]'
			) as HTMLElement | null;
			await expect.element(modal).not.toHaveAttribute('open');
		});

		it('keeps the modal open when addable repositories remain', async () => {
			h.stub = makeStub({
				addableCount: 1,
				selectedCount: 1,
				results: [{ path: '/a', name: 'a', alreadyAdded: false }]
			});
			const screen = renderWithTestWrapper(ScanRepositoriesModal, { open: true });
			await tick();

			h.onAdded(1);
			await tick();

			expect(screen.getByTestId('scan-add-selected')).toBeInTheDocument();
		});
	});
});
