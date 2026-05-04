/**
 * Restore Flow Composable
 *
 * State machine for restoring deleted branches:
 * - Picks between batch and single mutation paths based on count
 * - Queues conflicts that need interactive resolution
 * - Defers the success notification until every branch reaches a
 *   terminal state, so partial-success batches don't tear down the modal
 *   while conflicts are still pending.
 */

import {
	createRestoreDeletedBranchMutation,
	createRestoreDeletedBranchesMutation
} from './create-restore-deleted-branch-mutation';
import { useRestorationProgress } from './use-restoration-progress.svelte';
import type { Branch } from '$domains/branch-management/core/models/branch';
import { buildRestoreSuccessNotification } from '$domains/branch-management/utils/build-restore-success-notification';
import type { ConflictResolution, RestoreBranchResult } from '$infrastructure/bindings';
import { notifications } from '$services/notifications/notifications.svelte';

interface RestoreFlowRepository {
	id: string;
	name: string;
	path: string;
}

interface UseRestoreFlowProps {
	getRepository: () => RestoreFlowRepository | undefined;
	getBranches: () => Branch[];
	onComplete?: () => void;
}

export function useRestoreFlow({ getRepository, getBranches, onComplete }: UseRestoreFlowProps) {
	const progress = useRestorationProgress();

	let isProcessing = $state(false);
	let restorationResults = $state<Record<string, RestoreBranchResult>>({});
	let conflictResolutions = $state<Record<string, ConflictResolution>>({});
	let branchPreferences = $state<Record<string, ConflictResolution>>({});
	let currentConflictBranch = $state<string | null>(null);
	let pendingConflictBranches = $state<string[]>([]);
	// Branches whose mutation is currently in flight. Drives the per-row loading
	// indicator without polluting the result shape with a `processing` field.
	let inFlightBranches = $state<string[]>([]);

	// Successes accumulated across the whole flow — flushed as a single
	// notification once everything is done.
	let restoredAccumulator: RestoreBranchResult[] = [];

	function recordResult(branchName: string, result: RestoreBranchResult) {
		restorationResults = { ...restorationResults, [branchName]: result };
	}

	function markInFlight(branchName: string) {
		if (!inFlightBranches.includes(branchName)) {
			inFlightBranches = [...inFlightBranches, branchName];
		}
	}

	function clearInFlight(branchName: string) {
		inFlightBranches = inFlightBranches.filter((b) => b !== branchName);
	}

	function queuePending(branchName: string) {
		if (!pendingConflictBranches.includes(branchName)) {
			pendingConflictBranches = [...pendingConflictBranches, branchName];
		}
	}

	function dequeuePending(branchName: string) {
		pendingConflictBranches = pendingConflictBranches.filter((b) => b !== branchName);
	}

	const restoreMutation = createRestoreDeletedBranchMutation({
		async onSuccess(data, variables) {
			const branchName = variables.branchInfo.originalName;
			clearInFlight(branchName);
			recordResult(branchName, data.result);

			if (data.result.requiresUserAction && data.result.conflictDetails) {
				currentConflictBranch = branchName;
				queuePending(branchName);
				progress.tick();
				return;
			}

			currentConflictBranch = null;
			dequeuePending(branchName);
			if (data.result.success && !data.result.skipped) {
				restoredAccumulator.push(data.result);
			}
			progress.tick();
			advance();
		},
		onError(error, variables) {
			const branchName = variables.branchInfo.originalName;
			clearInFlight(branchName);
			notifications.push({
				feedback: 'danger',
				title: `Error restoring branch ${branchName}`,
				message: error.message
			});

			recordResult(branchName, {
				branchName,
				success: false,
				skipped: false,
				requiresUserAction: false,
				message: error.message,
				conflictDetails: null,
				branch: null
			});
			currentConflictBranch = null;
			dequeuePending(branchName);
			progress.tick();
			advance();
		}
	});

	const restoreBatchMutation = createRestoreDeletedBranchesMutation({
		async onSuccess(data) {
			for (const result of data.results) {
				clearInFlight(result.branchName);
				recordResult(result.branchName, result);
				if (result.requiresUserAction && result.conflictDetails) {
					queuePending(result.branchName);
				} else if (result.success && !result.skipped) {
					restoredAccumulator.push(result);
				}
			}
			progress.tick();
			advance();
		},
		onError(error) {
			inFlightBranches = [];
			notifications.push({
				feedback: 'danger',
				title: 'Error restoring branches',
				message: error.message
			});
			isProcessing = false;
		}
	});

	function advance() {
		if (pendingConflictBranches.length > 0) {
			processNextConflictBranch();
			return;
		}

		// Single-branch path: if there are still untouched branches, restore the next.
		const next = getBranches().find(
			(b) => !restorationResults[b.getName()] && !inFlightBranches.includes(b.getName())
		);
		if (next) {
			processNextBranch(next);
			return;
		}

		complete();
	}

	function processNextConflictBranch() {
		if (!getRepository()?.path || pendingConflictBranches.length === 0) return;
		// `currentConflictBranch` drives the prompt UI; the existing result already
		// carries the conflict details we got from the mutation, so no placeholder
		// shuffling is needed.
		currentConflictBranch = pendingConflictBranches[0];
	}

	function processNextBranch(branch: Branch) {
		const repository = getRepository();
		if (!repository?.path) return;

		const branchName = branch.getName();
		markInFlight(branchName);

		restoreMutation.mutate({
			path: repository.path,
			repoId: repository.id,
			branchInfo: {
				originalName: branchName,
				targetName: branchName,
				commitSha: branch.getLastCommit().getShortSha(),
				conflictResolution: conflictResolutions[branchName] || branchPreferences[branchName] || null
			}
		});
	}

	function complete() {
		const repository = getRepository();
		const notification = buildRestoreSuccessNotification(restoredAccumulator, repository?.name);
		if (notification) {
			notifications.push(notification);
		}
		isProcessing = false;
		onComplete?.();
	}

	function start() {
		const repository = getRepository();
		if (!repository?.path) return;

		const branches = getBranches();

		isProcessing = true;
		restorationResults = {};
		conflictResolutions = {};
		currentConflictBranch = null;
		pendingConflictBranches = [];
		inFlightBranches = [];
		restoredAccumulator = [];
		progress.start(branches.length);

		if (branches.length <= 1) {
			const next = branches[0];
			if (next) {
				processNextBranch(next);
			} else {
				complete();
			}
			return;
		}

		const branchInfos = branches.map((branch) => {
			const branchName = branch.getName();
			markInFlight(branchName);
			return {
				originalName: branchName,
				targetName: branchName,
				commitSha: branch.getLastCommit().getShortSha(),
				conflictResolution: branchPreferences[branchName] || null
			};
		});

		restoreBatchMutation.mutate({
			path: repository.path,
			repoId: repository.id,
			branchInfos
		});
	}

	function resolveConflict(resolution: ConflictResolution) {
		const repository = getRepository();
		if (!currentConflictBranch || !repository?.path) return;

		const branch = getBranches().find((b) => b.getName() === currentConflictBranch);
		if (!branch) return;

		const branchName = branch.getName();
		conflictResolutions = { ...conflictResolutions, [branchName]: resolution };
		currentConflictBranch = null;
		dequeuePending(branchName);
		markInFlight(branchName);

		restoreMutation.mutate({
			path: repository.path,
			repoId: repository.id,
			branchInfo: {
				originalName: branchName,
				targetName: branchName,
				commitSha: branch.getLastCommit().getShortSha(),
				conflictResolution: resolution
			}
		});
	}

	function setPreference(branchName: string, resolution: ConflictResolution) {
		branchPreferences = { ...branchPreferences, [branchName]: resolution };
	}

	function reset() {
		restorationResults = {};
		conflictResolutions = {};
		currentConflictBranch = null;
		pendingConflictBranches = [];
		inFlightBranches = [];
		branchPreferences = {};
		restoredAccumulator = [];
		isProcessing = false;
		progress.reset();
	}

	const isRestorationComplete = $derived(
		!isProcessing &&
			Object.keys(restorationResults).length > 0 &&
			pendingConflictBranches.length === 0 &&
			!currentConflictBranch
	);

	return {
		start,
		resolveConflict,
		setPreference,
		reset,
		get isProcessing() {
			return isProcessing;
		},
		get isRestorationComplete() {
			return isRestorationComplete;
		},
		get restorationResults() {
			return restorationResults;
		},
		get currentConflictBranch() {
			return currentConflictBranch;
		},
		get pendingConflictBranches() {
			return pendingConflictBranches;
		},
		get inFlightBranches() {
			return inFlightBranches;
		},
		get branchPreferences() {
			return branchPreferences;
		},
		get progress() {
			return progress.percent;
		},
		get processedCount() {
			return progress.processed;
		},
		get initialSelectedCount() {
			return progress.total;
		},
		get estimatedTimeRemaining() {
			return progress.estimatedTimeRemaining;
		}
	};
}
