import { tick } from 'svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BulkCleanupView from '../bulk-cleanup-view.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const h = vi.hoisted(() => ({
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	stub: undefined as any,
	goto: vi.fn()
}));

vi.mock('$domains/repository-cleanup/core/composables/use-stale-repositories.svelte', () => ({
	useStaleRepositories: vi.fn(() => h.stub)
}));

vi.mock('$domains/repository-cleanup/core/composables/use-cleanup-config.svelte', () => ({
	getCleanupConfig: () => ({ defaultDeletionMode: 'trash' })
}));

vi.mock('$app/navigation', () => ({ goto: h.goto }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeStub(overrides: Record<string, any> = {}) {
	return {
		repositories: [],
		hasScanned: true,
		isScanning: false,
		isRefreshing: false,
		isCleaning: false,
		progress: null,
		selectedCount: 0,
		selectedBytes: 0,
		repositoryCount: 1,
		totalReclaimableBytes: 0,
		allSelected: false,
		someSelected: false,
		setAll: vi.fn(),
		isTargetSelected: vi.fn(() => false),
		toggleTarget: vi.fn(),
		repoSelectedCount: vi.fn(() => 0),
		isRepoAllSelected: vi.fn(() => false),
		isRepoIndeterminate: vi.fn(() => false),
		toggleRepo: vi.fn(),
		rescan: vi.fn(),
		cleanSelected: vi.fn(() => Promise.resolve()),
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

describe('BulkCleanupView', () => {
	it('cleans the selected repositories when the requirement is met', async () => {
		h.stub = makeStub({ selectedCount: 2, selectedBytes: 4096 });
		const screen = await renderWithTestWrapper(BulkCleanupView, {});
		await tick();

		const clean = screen.getByTestId('cleanup-clean-selected');
		expect(clean).not.toBeDisabled();
		await clean.click();

		await vi.waitFor(() => expect(h.stub.cleanSelected).toHaveBeenCalledWith('trash'));
	});

	it('shows a validation hint and does not clean when nothing is selected', async () => {
		h.stub = makeStub({ selectedCount: 0 });
		const screen = await renderWithTestWrapper(BulkCleanupView, {});
		await tick();

		await screen.getByTestId('cleanup-clean-selected').click();

		await vi.waitFor(() => expect(openHint()).toBeTruthy());
		expect(openHint()?.textContent).toContain('Select at least one repository to clean.');
		expect(h.stub.cleanSelected).not.toHaveBeenCalled();
	});
	// The permanent-mode typed-confirm branch shares its logic with
	// clean-repository-modal, which covers it directly.

	describe('the grouped list', () => {
		const repositories = [
			{
				id: 'r1',
				name: 'alpha',
				path: '/p/alpha',
				staleSince: 0,
				reclaimableBytes: 3072,
				targets: [
					{ path: '/p/alpha/node_modules', folderName: 'node_modules', sizeBytes: 2048 },
					{ path: '/p/alpha/dist', folderName: 'dist', sizeBytes: 1024 }
				]
			},
			{
				id: 'r2',
				name: 'beta',
				path: '/p/beta',
				staleSince: 0,
				reclaimableBytes: 512,
				targets: [{ path: '/p/beta/.next', folderName: '.next', sizeBytes: 512 }]
			}
		];

		it('groups the folders by repository, with its activity and size on the title', async () => {
			h.stub = makeStub({ repositories, repositoryCount: 2 });
			const screen = await renderWithTestWrapper(BulkCleanupView, {});
			await tick();

			expect(screen.getByTestId('cleanup-target').elements()).toHaveLength(3);
			expect(screen.getByTestId('cleanup-repo-size').elements()).toHaveLength(2);
			await expect
				.element(screen.getByTestId('cleanup-repo-activity').first())
				.toMatchTextContent('/p/alpha');
		});

		it('routes a folder toggle to its own repository', async () => {
			h.stub = makeStub({
				repositories,
				repositoryCount: 2,
				isTargetSelected: vi.fn((_repoId: string, path: string) => path === '/p/alpha/dist')
			});
			const screen = await renderWithTestWrapper(BulkCleanupView, {});
			await tick();

			await expect
				.element(screen.getByRole('checkbox', { name: 'Select /p/alpha/dist' }))
				.toBeChecked();
			await screen.getByRole('checkbox', { name: 'Select /p/beta/.next' }).click();
			expect(h.stub.toggleTarget).toHaveBeenCalledWith('r2', '/p/beta/.next');
		});

		it('selects a whole repository from its group title', async () => {
			h.stub = makeStub({ repositories, repositoryCount: 2 });
			const screen = await renderWithTestWrapper(BulkCleanupView, {});
			await tick();

			await screen.getByRole('checkbox', { name: 'Select all in alpha' }).click();
			expect(h.stub.toggleTarget).toHaveBeenCalledWith('r1', '/p/alpha/node_modules');
			expect(h.stub.toggleTarget).toHaveBeenCalledWith('r1', '/p/alpha/dist');
			expect(h.stub.toggleTarget).not.toHaveBeenCalledWith('r2', expect.anything());
		});
	});
});
