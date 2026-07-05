import { open as openFolderDialog } from '@tauri-apps/plugin-dialog';
import { tick } from 'svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddRepositoryMenu from '../add-repository-menu.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));

const h = vi.hoisted(() => ({
	addFromDialog: vi.fn(() => Promise.resolve()),
	scan: vi.fn(() => Promise.resolve())
}));

vi.mock('../../core/composables/use-add-repository.svelte', () => ({
	useAddRepository: vi.fn(() => ({ isPending: false, addFromDialog: h.addFromDialog }))
}));

// Inert discovery composable so the embedded scan modal mounts harmlessly.
vi.mock('../../core/composables/use-discover-repositories.svelte', () => ({
	useDiscoverRepositories: vi.fn(() => ({
		results: [],
		scannedRoots: [],
		hasScanned: false,
		isScanning: false,
		isAdding: false,
		selectedCount: 0,
		addableCount: 0,
		isSelected: () => false,
		scan: h.scan,
		toggle: vi.fn(),
		setAll: vi.fn(),
		addSelected: vi.fn()
	}))
}));

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(openFolderDialog).mockResolvedValue(null);
});

describe('AddRepositoryMenu', () => {
	it('renders the primary add label by default', () => {
		const screen = renderWithTestWrapper(AddRepositoryMenu);
		expect(screen.getByText('Add a git repository')).toBeInTheDocument();
	});

	it('renders a visually hidden label in compact mode', () => {
		const screen = renderWithTestWrapper(AddRepositoryMenu, { visuallyHiddenLabel: true });
		expect(screen.getByText('Add a git repository')).toHaveClass('sr_true');
	});

	it('adds a repository when the primary button is clicked', async () => {
		const screen = renderWithTestWrapper(AddRepositoryMenu);
		await screen.getByRole('button', { name: /add a git repository/i }).click();

		expect(h.addFromDialog).toHaveBeenCalledOnce();
	});

	it('exposes a dropdown trigger for the scan options', () => {
		const screen = renderWithTestWrapper(AddRepositoryMenu);
		expect(screen.getByTestId('add-repository-menu-trigger')).toBeInTheDocument();
	});

	it('opens the scan modal from the "Scan this computer" option', async () => {
		const screen = renderWithTestWrapper(AddRepositoryMenu);

		await screen.getByTestId('add-repository-menu-trigger').click();
		await tick();

		await screen
			.getByRole('menuitem', { name: /scan this computer/i })
			.first()
			.click();

		// The modal auto-scans the home folder when opened with the home scope.
		await vi.waitFor(() => expect(h.scan).toHaveBeenCalledWith([]));
	});

	it('offers a "Scan a specific folder…" option', async () => {
		const screen = renderWithTestWrapper(AddRepositoryMenu);

		await screen.getByTestId('add-repository-menu-trigger').click();
		await tick();

		// The folder scope's behaviour (picker → scan) is covered end-to-end by
		// the scan modal's tests; here we just assert the option is offered.
		await expect
			.element(screen.getByRole('menuitem', { name: /scan a specific folder/i }).first())
			.toBeInTheDocument();
	});
});
