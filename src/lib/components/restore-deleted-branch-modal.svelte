<script lang="ts">
	import Icon from '@iconify/svelte';
	import Alert from '@pindoba/svelte-alert';
	import Button, { type ButtonProps } from '@pindoba/svelte-button';
	import Dialog from '@pindoba/svelte-dialog';
	import Group from '@pindoba/svelte-group';
	import Loading from '@pindoba/svelte-loading';
	import { useQueryClient } from '@tanstack/svelte-query';
	import Markdown from 'svelte-exmarkdown';
	import Branch from './branch.svelte';
	import {
		ConflictResolution,
		createRestoreDeletedBranchMutation,
		type RestoreBranchResult
	} from '$lib/services/createRestoreDeletedBranchMutation';
	import { getDeletedBranchesStore } from '$lib/stores/deleted-branches.svelte';
	import { notifications } from '$lib/stores/notifications.svelte';
	import { getRepositoryStore } from '$lib/stores/repository.svelte';
	import { getSelectedDeletedBranchesStore } from '$lib/stores/selected-branches.svelte';
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

	// Progress tracking
	let progress = $state(0);
	let startTime = $state<number | null>(null);
	let estimatedTimeRemaining = $state<string | null>(null);
	let processedCount = $state(0);
	let initialSelectedCount = $state(0);

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
		}
	});

	// Get all deleted branches that match our criteria
	const allDeletedBranches = $derived(deletedBranchesStore?.state?.branches ?? []);

	const selectedDeletedBranches = $derived(
		allDeletedBranches.filter((branch) => selectedDeletedBranchesStore?.state?.has(branch.name))
	);

	// Update progress and estimated time
	function updateProgress() {
		if (initialSelectedCount === 0) return;

		// Only count completed branches (not ones that require user action)
		const completedResults = Object.values(restorationResults).filter(
			(result) => !result.requiresUserAction
		);
		processedCount = completedResults.length;
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

			// Update results
			restorationResults = {
				...restorationResults,
				[branchName]: data
			};

			// Update progress after each branch
			updateProgress();

			// If we have a conflict that needs resolution
			if (data.requiresUserAction && data.conflictDetails) {
				currentConflictBranch = branchName;
				return; // Stop here and wait for user input
			}

			// Branch was successfully restored or skipped
			if (data.success) {
				// If successfully restored, remove from deleted branches store
				if (data.message.includes('restored') || data.message.includes('overwritten')) {
					deletedBranchesStore?.removeDeletedBranch(branchName);

					notifications.push({
						feedback: 'success',
						title: 'Branch restored',
						message: data.message
					});

					// Update repository data to reflect the new branch
					client.invalidateQueries({
						queryKey: ['branches', 'get-all', repository?.state?.path],
						refetchType: 'all'
					});
				}
			}

			// Continue to next branch if there are more to process
			processNextBranch();
		},
		onError(error) {
			notifications.push({
				feedback: 'danger',
				title: 'Error restoring branch',
				message: error.message
			});

			isProcessing = false;
		}
	});

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

		// Restore the next branch
		restoreMutation.mutate({
			path: repository.state.path,
			branchInfo: {
				originalName: nextBranch.name,
				targetName: nextBranch.name,
				commitSha: nextBranch.lastCommit.sha,
				conflictResolution: conflictResolutions[nextBranch.name]
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
		progress = 0;
		startTime = Date.now();
		estimatedTimeRemaining = 'Calculating...';
		processedCount = 0;
		initialSelectedCount = selectedDeletedBranches.length;

		// Start processing the first branch
		processNextBranch();
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
</script>

<Dialog
	bind:open
	title="Restore Deleted Branches"
	aria-label="Restore Deleted Branches"
	aria-describedby="Restore Deleted Branches"
	data-testid="restore-branch-dialog"
	showCloseButton={!isProcessing}
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
		<p data-testid="restore-branch-dialog-text">
			{#if isProcessing}
				Restoring selected branches...
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

	{#if isProcessing && !currentConflictBranch && selectedDeletedBranches.length > 0}
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
					>{processedCount} of {selectedDeletedBranches.length} branches restored</span
				>
				{#if estimatedTimeRemaining}
					<span data-testid="time-remaining">Estimated time: {estimatedTimeRemaining}</span>
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
						backgroundColor: 'primary.800',
						transition: 'width 0.3s ease-in-out'
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
							!restorationResults[branch.name]}
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
		{#if Object.keys(restorationResults).length > 0 && !isProcessing && !currentConflictBranch}
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
				disabled={isProcessing}
				data-testid="cancel-button"
			>
				Cancel
			</Button>
			{#if !currentConflictBranch}
				<Loading isLoading={isProcessing}>
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
