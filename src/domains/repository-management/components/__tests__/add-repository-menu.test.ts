import { open as openFolderDialog } from '@tauri-apps/plugin-dialog';
import { tick } from 'svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AddRepositoryMenu from '../add-repository-menu.svelte';
import { repositorySort } from '$lib/repository-sort.svelte';
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
		cancelScan: vi.fn(),
		toggle: vi.fn(),
		setAll: vi.fn(),
		addSelected: vi.fn()
	}))
}));

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(openFolderDialog).mockResolvedValue(null);
	localStorage.clear();
	repositorySort.setMode('name-asc');
});

// The Pindoba menu portals its panel into a `<dialog>` on `document.body` that
// outlives the component unmount; clear any leftovers so a prior test's open
// menu can't intercept pointer events in the next one.
afterEach(() => {
	document.querySelectorAll('dialog[data-popover]').forEach((dialog) => dialog.remove());
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
		await vi.waitFor(() => expect(h.scan).toHaveBeenCalledWith([], false));
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

	describe('repository sort section', () => {
		it('omits the sort options by default', async () => {
			const screen = renderWithTestWrapper(AddRepositoryMenu);

			await screen.getByTestId('add-repository-menu-trigger').click();
			await tick();

			await expect
				.element(screen.getByRole('menuitemradio', { name: /most branches/i }).first())
				.not.toBeInTheDocument();
		});

		it('exposes the sort radio group when enabled', async () => {
			const screen = renderWithTestWrapper(AddRepositoryMenu, { withRepositorySort: true });

			await screen.getByTestId('add-repository-menu-trigger').click();
			await tick();

			await expect
				.element(screen.getByRole('menuitemradio', { name: /name \(a–z\)/i }).first())
				.toBeInTheDocument();
		});

		it('updates the shared sort preference when an option is picked', async () => {
			const screen = renderWithTestWrapper(AddRepositoryMenu, { withRepositorySort: true });

			await screen.getByTestId('add-repository-menu-trigger').click();
			await tick();

			await screen
				.getByRole('menuitemradio', { name: /most branches/i })
				.first()
				.click();
			await tick();

			expect(repositorySort.mode).toBe('branches-desc');
			expect(localStorage.getItem('repository-nav-sort')).toBe(JSON.stringify('branches-desc'));
		});
	});

	describe('manage repositories action', () => {
		it('omits the manage action by default', async () => {
			const screen = renderWithTestWrapper(AddRepositoryMenu);

			await screen.getByTestId('add-repository-menu-trigger').click();
			await tick();

			await expect
				.element(screen.getByRole('menuitem', { name: /manage repositories/i }).first())
				.not.toBeInTheDocument();
		});

		it('offers a manage action when enabled', async () => {
			const screen = renderWithTestWrapper(AddRepositoryMenu, { withManageRepositories: true });

			await screen.getByTestId('add-repository-menu-trigger').click();
			await tick();

			await expect
				.element(screen.getByRole('menuitem', { name: /manage repositories/i }).first())
				.toBeInTheDocument();
		});
	});
});
