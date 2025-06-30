<script lang="ts">
	import Icon from '@iconify/svelte';
	import Alert from '@pindoba/svelte-alert';
	import Button, { type ButtonProps } from '@pindoba/svelte-button';
	import Dialog from '@pindoba/svelte-dialog';
	import Group from '@pindoba/svelte-group';
	import Loading from '@pindoba/svelte-loading';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { listen } from '@tauri-apps/api/event';
	import { onMount, onDestroy } from 'svelte';
	import Markdown from 'svelte-exmarkdown';
	import Branch from './branch.svelte';
	import {
		ConflictResolution,
		createRestoreDeletedBranchMutation,
		createRestoreDeletedBranchesMutation,
		type RestoreBranchResult
	} from '$domains/branch-management/services/createRestoreDeletedBranchMutation';
	import { getDeletedBranchesStore } from '$domains/branch-management/store/deleted-branches.svelte';
	import { getSelectedDeletedBranchesStore } from '$domains/branch-management/store/selected-branches.svelte';
	import { notifications } from '$domains/notifications/store/notifications.svelte';
	import { getRepositoryStore } from '$domains/repository-management/store/repository.svelte';
	import { formatString, ensureString } from '$utils/string-utils';
	import { css } from '@pindoba/panda/css';

	const client = useQueryClient();

	interface Props {
		repoId?: string;
		buttonProps?: Omit<ButtonProps, 'onclick'>;
	}

	let { repoId, buttonProps }: Props = $props();
	const repository = $derived(getRepositoryStore(repoId));
	const deletedBranchesStore = $derived(getDeletedBranchesStore(repository?.state?.id));
	const selectedDeletedBranchesStore = $derived(
		getSelectedDeletedBranchesStore(repository?.state?.id)
	);

	let open = $state(false);
	let isProcessing = $state(false);
	let restorationResults = $state<Record<string, RestoreBranchResult>>({});
	let conflictResolutions = $state<Record<string, ConflictResolution>>({});
	let currentConflictBranch = $state<string | null>(null);

	// New state for preemptive conflict resolution
	let branchPreferences = $state<Record<string, ConflictResolution>>({});
	let existingBranches = $state<string[]>([]);

	// Track branches with pending conflicts
	let pendingConflictBranches = $state<string[]>([]);

	// Progress tracking
	let progress = $state(0);
	let startTime = $state<number | null>(null);
	let estimatedTimeRemaining = $state<string | null>(null);
	let processedCount = $state(0);
	let initialSelectedCount = $state(0);

	let unlisten: (() => void) | null = null;

	onMount(async () => {
		// Listen for branch restoration events
		unlisten = await listen('branch-restored', () => {
			// Instead of directly incrementing processedCount, we'll let updateProgress handle it
			// based on the restorationResults
			updateProgress();
		});
	});

	onDestroy(() => {
		if (unlisten) {
			unlisten();
		}
	});

	// Reset the state when the modal is closed
	$effect(() => {
		if (!open) {
			// Only reset when modal is closed, not when opened
			restorationResults = {};
			conflictResolutions = {};
			currentConflictBranch = null;
			isProcessing = false;
			progress = 0;
			startTime = null;
			estimatedTimeRemaining = null;
			processedCount = 0;
			initialSelectedCount = 0;
			branchPreferences = {};
			pendingConflictBranches = [];
		} else {
			// When modal opens, check if any branches already exist
			checkExistingBranches();
		}
	});

	// Get all deleted branches that match our criteria
	const allDeletedBranches = $derived(deletedBranchesStore?.state?.branches ?? []);

	const selectedDeletedBranches = $derived(
		allDeletedBranches.filter((branch) => selectedDeletedBranchesStore?.state?.has(branch.name))
	);

	// Check which branches already exist in the repository
	async function checkExistingBranches() {
		if (!repository?.state?.path) return;

		try {
			// Get existing branches from the repository
			const response = await client.fetchQuery({
				queryKey: ['branches', 'get-all', repository.state.path]
			});

			if (response && Array.isArray(response)) {
				// Extract branch names and find overlaps with our selected branches
				const existingBranchNames = response.map((branch) => branch.name);
				existingBranches = existingBranchNames;

				// Initialize preferences for branches that might conflict
				selectedDeletedBranches.forEach((branch) => {
					if (existingBranchNames.includes(branch.name)) {
						// Default to skip for safety
						branchPreferences[branch.name] = ConflictResolution.Skip;
					}
				});
			}
		} catch (error) {
			console.error('Failed to check existing branches', error);
		}
	}

	// Update progress and estimated time
	function updateProgress() {
		if (initialSelectedCount === 0) return;

		// Calculate processed count based on actual results, not an incrementing counter
		// const completedCount = Object.values(restorationResults).filter(
		// 	(result) => !result.requiresUserAction || result.skipped || result.processing
		// ).length;

		processedCount++;
		progress = (processedCount / initialSelectedCount) * 100;

		if (startTime && processedCount > 0) {
			const elapsedTime = Date.now() - startTime;
			const timePerBranch = elapsedTime / processedCount;
			const remainingBranches = initialSelectedCount - processedCount;
			const estimatedTimeMs = timePerBranch * remainingBranches;

			if (estimatedTimeMs > 0) {
				if (estimatedTimeMs < 60000) {
					estimatedTimeRemaining = `${Math.ceil(estimatedTimeMs / 1000)} seconds`;
				} else {
					estimatedTimeRemaining = `${Math.ceil(estimatedTimeMs / 60000)} minutes`;
				}
			} else {
				estimatedTimeRemaining = 'Almost done';
			}
		}
	}

	const restoreMutation = createRestoreDeletedBranchMutation({
		onSuccess(data, variables) {
			const branchName = variables.branchInfo.originalName;

			// Update results immediately when the mutation starts
			restorationResults = {
				...restorationResults,
				[branchName]: { ...(data as RestoreBranchResult), processing: false }
			};

			// If we have a conflict that needs resolution (even after an attempt)
			if (data.requiresUserAction && data.conflictDetails) {
				currentConflictBranch = branchName; // Keep or set it as current

				// Ensure it's in pending if not already (should be there from batch or previous step)
				if (!pendingConflictBranches.includes(branchName)) {
					pendingConflictBranches = [...pendingConflictBranches, branchName];
				}

				// Update progress after each branch (even for conflicts)
				updateProgress();
				return; // Stop here and wait for user input
			}

			// Branch was successfully restored or skipped (no longer requiresUserAction)
			// So, it's no longer a "pending conflict" in the interactive sense.
			currentConflictBranch = null; // Explicitly clear before potentially setting the next one
			pendingConflictBranches = pendingConflictBranches.filter((b) => b !== branchName);

			if (data.success) {
				// If successfully restored, remove from deleted branches store
				if (data.success && !data.skipped) {
					deletedBranchesStore?.removeDeletedBranch(branchName);
					try {
						notifications.push({
							feedback: 'success',
							title: formatString('Branch restored to {repo} repository', {
								repo: ensureString(repository?.state?.name)
							}),
							message: formatString('- **{name}** (at {sha})', {
								name: ensureString(branchName).trim(),
								sha: data.branch ? ensureString(data.branch.lastCommit.shortSha).trim() : ''
							})
						});

						// Update repository data to reflect the new branch
						client.invalidateQueries({
							queryKey: ['branches', 'get-all', repository?.state?.path]
						});
					} catch (e) {
						console.error('Error during notification or query invalidation:', e);
					}
				}
			}

			// Update progress after each branch
			updateProgress();

			// Continue to next branch if there are more to process
			if (pendingConflictBranches.length > 0) {
				// Process the next conflict branch
				processNextConflictBranch(); // This will set currentConflictBranch
			} else {
				// Process next normal branch
				processNextBranch(); // This will attempt to restore non-conflicting branches
			}
		},
		onError(error, variables) {
			const branchName = variables.branchInfo.originalName;
			notifications.push({
				feedback: 'danger',
				title: `Error restoring branch ${branchName}`,
				message: error.message
			});

			// Treat error as a "processed" branch for progress, but not successful
			restorationResults = {
				...restorationResults,
				[branchName]: {
					branchName,
					success: false,
					skipped: false,
					requiresUserAction: false,
					message: error.message,
					conflictDetails: null,
					branch: null,
					processing: false
				}
			};
			currentConflictBranch = null; // Clear current conflict on error for this branch
			pendingConflictBranches = pendingConflictBranches.filter((b) => b !== branchName);
			updateProgress(); // Update progress even on error

			// Continue with next branch instead of stopping entirely
			if (pendingConflictBranches.length > 0) {
				processNextConflictBranch();
			} else {
				processNextBranch();
			}
		}
	});

	// New mutation for batch processing
	const restoreBatchMutation = createRestoreDeletedBranchesMutation({
		onSuccess(data) {
			// Process all the results
			for (const [branchName, result] of data) {
				// Update results immediately when the mutation starts
				restorationResults = {
					...restorationResults,
					[branchName]: { ...(result as RestoreBranchResult), processing: false }
				};

				// If successfully restored, remove from deleted branches store
				if (result.success && !result.skipped) {
					deletedBranchesStore?.removeDeletedBranch(branchName);
				}

				// Collect branches that need conflict resolution
				if (result.requiresUserAction && result.conflictDetails) {
					pendingConflictBranches = [...pendingConflictBranches, branchName];
				}
			}

			// Update progress
			updateProgress();

			// Show success notification for batch operations
			const restoredBranches = data.filter(([_, result]) => result.success && !result.skipped);

			if (restoredBranches.length > 0) {
				try {
					const m = restoredBranches
						.map(([branchName, result]) => {
							// Use the branch information from the result
							const branch = result.branch;
							return formatString('- **{name}** (at {sha})', {
								name: ensureString(branchName).trim(),
								sha: branch ? ensureString(branch.lastCommit.shortSha).trim() : ''
							});
						})
						.join('\n\n');

					notifications.push({
						feedback: 'success',
						title: formatString('{type} restored to {repo} repository', {
							type: restoredBranches.length > 1 ? 'Branches' : 'Branch',
							repo: ensureString(repository?.state?.name)
						}),
						message: m
					});

					// Update repository data to reflect the new branches
					client.invalidateQueries({
						queryKey: ['branches', 'get-all', repository?.state?.path]
					});
				} catch (e) {
					console.error('Error during batch notification or query invalidation:', e);
				}
			}

			// If we have conflicts to resolve, handle the first one
			if (pendingConflictBranches.length > 0) {
				processNextConflictBranch();
			} else {
				// Otherwise, we're done
				isProcessing = false;
				selectedDeletedBranchesStore?.clear();
				open = false;
			}
		},
		onError(error) {
			notifications.push({
				feedback: 'danger',
				title: 'Error restoring branches',
				message: error.message
			});

			isProcessing = false;
		}
	});

	// Process the next branch that has a conflict
	function processNextConflictBranch() {
		if (!repository?.state?.path || pendingConflictBranches.length === 0) {
			// If no more conflicts, process remaining normal branches
			if (selectedDeletedBranches.some((branch) => !restorationResults[branch.name])) {
				processNextBranch();
			} else {
				// All done
				isProcessing = false;
				// Only clear if we successfully processed everything
				if (Object.keys(restorationResults).length === selectedDeletedBranches.length) {
					selectedDeletedBranchesStore?.clear();
				}
			}
			return;
		}

		// Get the next conflict branch
		const nextConflictName = pendingConflictBranches[0];
		currentConflictBranch = nextConflictName;

		// Set the branch as processing immediately
		restorationResults = {
			...restorationResults,
			[nextConflictName]: {
				...(restorationResults[nextConflictName] || {}),
				branchName: nextConflictName,
				success: false,
				skipped: false,
				requiresUserAction: true,
				message: '',
				conflictDetails: null,
				branch: null,
				processing: true
			}
		};

		// Don't remove from pendingConflictBranches yet - this will happen in onSuccess
	}

	// Process branches one by one
	function processNextBranch() {
		if (!repository?.state?.path) return;

		// Find the next branch to process (one that hasn't been processed yet)
		const nextBranch = selectedDeletedBranches.find((branch) => !restorationResults[branch.name]);

		if (!nextBranch) {
			// All branches processed
			isProcessing = false;
			// Clear selected branches only after all processing is complete
			selectedDeletedBranchesStore?.clear();
			open = false;
			return;
		}

		// Set the branch as processing immediately
		restorationResults = {
			...restorationResults,
			[nextBranch.name]: {
				...(restorationResults[nextBranch.name] || {}),
				branchName: nextBranch.name,
				success: false,
				skipped: false,
				requiresUserAction: false,
				message: '',
				conflictDetails: null,
				branch: null,
				processing: true
			}
		};

		// Restore the next branch
		restoreMutation.mutate({
			path: repository.state.path,
			branchInfo: {
				originalName: nextBranch.name,
				targetName: nextBranch.name,
				commitSha: nextBranch.lastCommit.sha,
				conflictResolution:
					conflictResolutions[nextBranch.name] || branchPreferences[nextBranch.name]
			}
		});
	}

	// Start the restoration process
	function handleRestore() {
		if (!repository?.state?.path) return;

		isProcessing = true;
		restorationResults = {};
		conflictResolutions = {};
		currentConflictBranch = null;
		pendingConflictBranches = [];
		progress = 0;
		startTime = Date.now();
		estimatedTimeRemaining = 'Calculating...';
		processedCount = 0;
		initialSelectedCount = selectedDeletedBranches.length;

		if (selectedDeletedBranches.length <= 1) {
			// For a single branch, use the regular approach
			processNextBranch();
		} else {
			// For multiple branches, use the batch approach for better performance
			const branchInfos = selectedDeletedBranches.map((branch) => ({
				originalName: branch.name,
				targetName: branch.name,
				commitSha: branch.lastCommit.sha,
				conflictResolution: branchPreferences[branch.name] || null // Use preemptive resolution if set
			}));

			restoreBatchMutation.mutate({
				path: repository.state.path,
				branchInfos
			});
		}
	}

	// Handle conflict resolution
	function resolveConflict(resolution: ConflictResolution) {
		if (!currentConflictBranch || !repository?.state?.path) return;

		const branch = selectedDeletedBranches.find((b) => b.name === currentConflictBranch);
		if (!branch) return;

		// Update conflict resolution and continue
		conflictResolutions = {
			...conflictResolutions,
			[currentConflictBranch]: resolution
		};

		// Clear current conflict branch before starting next one
		currentConflictBranch = null;

		// Continue with the same branch but now with resolution
		restoreMutation.mutate({
			path: repository.state.path,
			branchInfo: {
				originalName: branch.name,
				targetName: branch.name,
				commitSha: branch.lastCommit.sha,
				conflictResolution: resolution
			}
		});
	}

	// Update preference for a branch before restoration
	function updateBranchPreference(branchName: string, resolution: ConflictResolution) {
		branchPreferences = {
			...branchPreferences,
			[branchName]: resolution
		};
	}

	function handleCancel() {
		if (isProcessing) return; // Don't allow canceling while processing
		open = false;
	}

	// Get the status icon for a branch
	function getStatusIcon(result: RestoreBranchResult | undefined) {
		if (!result) return { icon: 'ion:ellipse-outline', color: 'gray.500' };

		if (result.success) {
			return { icon: 'ion:checkmark-circle', color: 'success' };
		} else if (result.requiresUserAction) {
			return { icon: 'ion:alert-circle', color: 'warning' };
		} else {
			return { icon: 'ion:close-circle', color: 'danger' };
		}
	}

	// Check if restoration is complete (for conditional UI rendering)
	const isRestorationComplete = $derived(
		isProcessing === false &&
			Object.keys(restorationResults).length > 0 &&
			pendingConflictBranches.length === 0 &&
			!currentConflictBranch
	);
</script>

<Dialog
	bind:open
	title="Restore Deleted Branches"
	aria-label="Restore Deleted Branches"
	aria-describedby="Restore Deleted Branches"
	data-testid="restore-branch-dialog"
	showCloseButton={!isProcessing || isRestorationComplete}
	class={css({
		width: '600px'
	})}
>
	{#if currentConflictBranch}
		<div
			class={css({
				display: 'flex',
				flexDirection: 'column',
				gap: 'md',
				padding: 'md',
				backgroundColor: 'warning.50',
				borderRadius: 'md'
			})}
		>
			<div
				class={css({
					fontWeight: 'medium',
					fontSize: 'lg',
					display: 'flex',
					alignItems: 'center',
					gap: 'sm',
					color: 'warning.800'
				})}
			>
				<Icon icon="ion:alert-circle" width="24px" height="24px" />
				Branch Name Conflict
			</div>

			<p>
				A branch named <strong>"{currentConflictBranch}"</strong> already exists. How would you like
				to proceed?
			</p>

			<div
				class={css({
					display: 'flex',
					gap: 'md',
					marginLeft: 'auto'
				})}
			>
				<Button
					feedback="danger"
					emphasis="secondary"
					onclick={() => resolveConflict(ConflictResolution.Overwrite)}
					data-testid="overwrite-button"
				>
					Overwrite Existing
				</Button>

				<Button
					emphasis="secondary"
					onclick={() => resolveConflict(ConflictResolution.Skip)}
					data-testid="skip-button"
				>
					Skip
				</Button>
			</div>
		</div>
	{:else}
		<div class="header">
			<h2>Restore Deleted Branch</h2>
		</div>
		<p data-testid="restore-branch-dialog-text">
			{#if isProcessing && !isRestorationComplete}
				Restoring selected branches...
				{#if pendingConflictBranches.length > 0}
					<span class={css({ color: 'warning.600', fontWeight: 'medium' })}>
						({pendingConflictBranches.length}
						{pendingConflictBranches.length === 1 ? 'branch needs' : 'branches need'} resolution)
					</span>
				{/if}
			{:else if isRestorationComplete}
				Restoration complete.
			{:else}
				Are you sure you want to restore
				<strong class={css({ color: 'primary.800' })}>
					{selectedDeletedBranches.length}
					{selectedDeletedBranches.length === 1 ? 'branch' : 'branches'}
				</strong>
				from repository
				<strong class={css({ color: 'primary.800' })}>
					{repository?.state?.name}
				</strong>?
			{/if}
		</p>
	{/if}

	{#if isProcessing && !isRestorationComplete}
		<div
			class={css({
				display: 'flex',
				flexDirection: 'column',
				gap: 'xs'
			})}
			data-testid="progress-container"
		>
			<div
				class={css({
					display: 'flex',
					justifyContent: 'space-between',
					fontSize: 'sm'
				})}
			>
				<span data-testid="progress-text"
					>{processedCount} of {initialSelectedCount} branches restored</span
				>
				{#if estimatedTimeRemaining && pendingConflictBranches.length === 0}
					<span data-testid="time-remaining"
						>Estimated time remaining: {estimatedTimeRemaining}</span
					>
				{/if}
			</div>
			<div
				class={css({
					width: '100%',
					height: '12px',
					borderStyle: 'solid',
					borderWidth: '1px',
					borderColor: 'neutral.400',
					_light: {
						backgroundColor: 'neutral.50'
					},
					_dark: {
						backgroundColor: 'neutral.200'
					},
					borderRadius: 'full',
					overflow: 'hidden'
				})}
			>
				<div
					class={css({
						height: '100%',
						backgroundColor: 'primary.800'
					})}
					style={`width: ${progress}%`}
					data-testid="progress-bar"
				></div>
			</div>
		</div>
	{/if}

	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			gap: 'sm',
			maxHeight: '50vh',
			overflowY: 'auto'
		})}
	>
		{#each [...selectedDeletedBranches].sort((a, b) => {
			// Sort pending conflicts first
			const aIsPending = pendingConflictBranches.includes(a.name);
			const bIsPending = pendingConflictBranches.includes(b.name);

			if (aIsPending !== bIsPending) {
				return aIsPending ? -1 : 1;
			}

			// Then sort by skipped status
			const aSkipped = restorationResults[a.name]?.skipped ?? false;
			const bSkipped = restorationResults[b.name]?.skipped ?? false;
			return aSkipped === bSkipped ? 0 : aSkipped ? 1 : -1;
		}) as branch (`${branch.name}-${branch.lastCommit.sha}`)}
			<div class={css({ position: 'relative' })}>
				{#if restorationResults[branch.name]}
					<div
						class={[
							css({
								position: 'absolute',
								top: '8px',
								right: '8px',
								zIndex: 10,
								display: 'flex',
								alignItems: 'center',
								gap: 'xs'
							}),
							getStatusIcon(restorationResults[branch.name]).color === 'success' &&
								css({ color: 'success.800' }),
							getStatusIcon(restorationResults[branch.name]).color === 'warning' &&
								css({ color: 'warning.800' }),
							getStatusIcon(restorationResults[branch.name]).color === 'danger' &&
								css({ color: 'danger.800' })
						]}
					>
						<span
							class={css({
								fontSize: 'xs',
								flexDirection: 'row'
							})}
						>
							{restorationResults[branch.name].skipped ? 'Skipped' : ''}
							{pendingConflictBranches.includes(branch.name) ? 'Pending resolution' : ''}
						</span>
						<Icon
							icon={getStatusIcon(restorationResults[branch.name]).icon}
							width="20px"
							height="20px"
						/>
					</div>
				{/if}
				<div
					class={css({
						'& > div': {
							marginBottom: '0'
						}
					})}
				>
					<Loading
						isLoading={currentConflictBranch !== branch.name &&
							isProcessing &&
							!restorationResults[branch.name] &&
							!pendingConflictBranches.includes(branch.name)}
						passThrough={{
							root: css.raw({
								width: '100%'
							}),
							overlay: css.raw({
								boxShadow: 'none'
							})
						}}
					>
						<Group direction="vertical">
							<Branch data={branch} />
							{#if !isProcessing && existingBranches.includes(branch.name)}
								<div
									class={css({
										display: 'flex',
										alignItems: 'center',
										gap: 'md',
										padding: 'xs',
										backgroundColor: 'warning.50',
										borderRadius: 'md'
									})}
									data-testid="branch-conflict-warning"
								>
									<Icon icon="ion:alert-circle" width="16px" height="16px" color="#f59e0b" />
									<span class={css({ fontSize: 'sm', color: 'warning.800' })}>
										Branch already exists
									</span>
									<div class={css({ marginLeft: 'auto', display: 'flex', gap: 'xs' })}>
										<Button
											size="xs"
											emphasis={branchPreferences[branch.name] === ConflictResolution.Skip
												? 'primary'
												: 'secondary'}
											onclick={() => updateBranchPreference(branch.name, ConflictResolution.Skip)}
											data-testid="pre-skip-button"
										>
											Skip
										</Button>
										<Button
											size="xs"
											feedback="danger"
											emphasis={branchPreferences[branch.name] === ConflictResolution.Overwrite
												? 'primary'
												: 'secondary'}
											onclick={() =>
												updateBranchPreference(branch.name, ConflictResolution.Overwrite)}
											data-testid="pre-overwrite-button"
										>
											Overwrite
										</Button>
									</div>
								</div>
							{/if}
							{#if pendingConflictBranches.includes(branch.name) && branch.name !== currentConflictBranch}
								<div
									class={css({
										padding: 'xs',
										backgroundColor: 'warning.50',
										borderRadius: 'md',
										fontSize: 'sm',
										color: 'warning.800'
									})}
								>
									Waiting for user resolution...
								</div>
							{/if}
							{#if restorationResults[branch.name]?.message}
								<Alert feedback="warning">
									<Markdown md={restorationResults[branch.name].message} />
								</Alert>
							{/if}
						</Group>
					</Loading>
				</div>
			</div>
		{/each}
	</div>

	<div
		class={css({
			display: 'flex',
			justifyContent: 'flex-end',
			gap: 'md',
			marginTop: 'md'
		})}
	>
		{#if isRestorationComplete}
			<Button
				emphasis="primary"
				onclick={() => {
					open = false;
				}}
				data-testid="done-button"
			>
				Done
			</Button>
		{:else}
			<Button
				emphasis="secondary"
				onclick={handleCancel}
				disabled={isProcessing && !isRestorationComplete}
				data-testid="cancel-button"
			>
				Cancel
			</Button>
			{#if !currentConflictBranch}
				<Loading isLoading={isProcessing && !isRestorationComplete}>
					<Button emphasis="primary" autofocus onclick={handleRestore} data-testid="restore-button">
						Restore
					</Button>
				</Loading>
			{/if}
		{/if}
	</div>
</Dialog>

<Button
	emphasis="primary"
	size="sm"
	disabled={selectedDeletedBranches.length === 0}
	class={css({
		gap: 'xs',
		display: 'flex',
		whiteSpace: 'nowrap'
	})}
	onclick={() => {
		open = true;
	}}
	{...buttonProps}
	data-testid="open-restore-dialog-button"
>
	<Icon icon="lucide:undo" width="16px" height="16px" />
	Restore ({selectedDeletedBranches.length})
</Button>

<style>
	.header {
		margin-bottom: 1rem;
	}
</style>
