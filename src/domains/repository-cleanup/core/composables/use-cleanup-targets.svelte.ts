import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { SvelteSet } from 'svelte/reactivity';
import { createCleanRepositoryMutation } from '$domains/repository-cleanup/infrastructure/mutations/create-clean-repository-mutation';
import { createScanCleanupTargetsMutation } from '$domains/repository-cleanup/infrastructure/mutations/create-scan-cleanup-targets-mutation';
import type {
	CleanupScanProgressEvent,
	CleanupTarget,
	DeletionMode
} from '$infrastructure/bindings';
import { notifications } from '$services/notifications/notifications.svelte';
import { formatBytes } from '$utils/format-bytes';

interface UseCleanupTargetsOptions {
	/** Invoked with the total bytes freed after a successful clean. */
	onCleaned?: (freedBytes: number) => void;
}

/** Live progress of an in-flight target scan, streamed from the backend. */
export interface TargetScanProgress {
	measured: number;
}

/**
 * Application logic for the per-repository cleanup flow: scan a single repo for
 * cleanable folders, let the user pick which to delete, then delete them.
 * Mirrors `useDiscoverRepositories` (explicit scan mutation + SvelteSet
 * selection + streamed progress + summary notification).
 */
export function useCleanupTargets(options: UseCleanupTargetsOptions = {}) {
	const scanMutation = createScanCleanupTargetsMutation({ meta: { showErrorNotification: true } });
	const cleanMutation = createCleanRepositoryMutation({ meta: { showErrorNotification: true } });

	let targets = $state<CleanupTarget[]>([]);
	let hasScanned = $state(false);
	let progress = $state<TargetScanProgress | null>(null);
	// Reactive on mutation; mutated in place (no `$state` wrapper needed).
	const selected = new SvelteSet<string>();

	const selectedTargets = $derived(targets.filter((t) => selected.has(t.path)));
	const selectedCount = $derived(selectedTargets.length);
	const selectedBytes = $derived(selectedTargets.reduce((sum, t) => sum + t.sizeBytes, 0));
	const totalBytes = $derived(targets.reduce((sum, t) => sum + t.sizeBytes, 0));

	/** Scans one repository, replacing previous results and selecting all targets. */
	async function scan(repositoryPath: string) {
		progress = { measured: 0 };

		let unlisten: UnlistenFn | null = null;
		try {
			unlisten = await listen<CleanupScanProgressEvent>('cleanup-scan-progress', (event) => {
				progress = { measured: event.payload.measured };
			});
		} catch {
			unlisten = null;
		}

		try {
			const output = await scanMutation.mutateAsync({
				repositoryPath
			});
			targets = output.targets;
			selected.clear();
			for (const target of targets) selected.add(target.path);
			hasScanned = true;
			progress = { measured: targets.length };
		} finally {
			unlisten?.();
		}
	}

	/** Toggles a single target's selection. */
	function toggle(path: string) {
		if (selected.has(path)) {
			selected.delete(path);
		} else {
			selected.add(path);
		}
	}

	/** Selects or clears every target. */
	function setAll(checked: boolean) {
		selected.clear();
		if (checked) {
			for (const target of targets) selected.add(target.path);
		}
	}

	/** Deletes the selected targets from the repository in the given mode. */
	async function clean(repositoryId: string, repositoryPath: string, mode: DeletionMode) {
		if (selectedTargets.length === 0) return;

		// Folder names the user approved from `.gitignore` (not on the built-in allowlist).
		const approvedExtra = [
			...new SvelteSet(
				selectedTargets.filter((t) => t.source === 'gitignore').map((t) => t.folderName)
			)
		];

		const output = await cleanMutation.mutateAsync({
			repositoryId,
			repositoryPath,
			targets: selectedTargets.map((t) => t.path),
			mode,
			approvedExtra
		});

		const succeeded = output.results.filter((r) => r.ok);
		const failed = output.results.filter((r) => !r.ok);

		// Drop cleaned targets from the list so it reflects reality without a re-scan.
		const cleanedPaths = new SvelteSet(succeeded.map((r) => r.path));
		targets = targets.filter((t) => !cleanedPaths.has(t.path));
		for (const path of cleanedPaths) selected.delete(path);

		notifications.push({
			feedback: failed.length > 0 ? 'warning' : 'success',
			title:
				mode === 'trash'
					? `Moved ${succeeded.length} folder${succeeded.length === 1 ? '' : 's'} to Trash`
					: `Deleted ${succeeded.length} folder${succeeded.length === 1 ? '' : 's'}`,
			message:
				`Reclaimed ${formatBytes(output.freedBytes)}` +
				(failed.length > 0 ? ` · ${failed.length} could not be deleted` : '') +
				(mode === 'trash' ? '\n\nEmpty your Trash to actually free the space.' : '')
		});

		options.onCleaned?.(output.freedBytes);
	}

	return {
		get targets() {
			return targets;
		},
		get hasScanned() {
			return hasScanned;
		},
		get isScanning() {
			return scanMutation.isPending;
		},
		get isCleaning() {
			return cleanMutation.isPending;
		},
		get progress() {
			return progress;
		},
		get selectedCount() {
			return selectedCount;
		},
		get selectedBytes() {
			return selectedBytes;
		},
		get totalBytes() {
			return totalBytes;
		},
		get targetCount() {
			return targets.length;
		},
		isSelected(path: string) {
			return selected.has(path);
		},
		scan,
		toggle,
		setAll,
		clean
	};
}
