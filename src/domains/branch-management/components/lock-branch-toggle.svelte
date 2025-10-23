<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import {
		createAddLockedBranchesMutation,
		createRemoveLockedBranchesMutation
	} from '$domains/branch-management/core/composables/create-locked-branches-mutations';
	import { createLockedBranchesQuery } from '$domains/branch-management/core/composables/create-locked-branches-query';
	import { createUpdateBranchSelectionBatchMutation } from '$domains/branch-management/core/composables/create-selected-branches-mutations';
	import { formatString } from '$utils/string-utils';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';

	interface Props {
		branch: string;
		repositoryID?: string;
		disabled?: boolean;
	}

	let { branch, repositoryID, disabled = false }: Props = $props();

	const lockedQueryInput = $derived({ repoId: repositoryID ?? '' });

	// Query for locked branches
	const lockedQuery = createLockedBranchesQuery(() => lockedQueryInput);

	// Mutations for locked branches - no need for manual invalidation
	const addLockedMutation = createAddLockedBranchesMutation();

	const removeLockedMutation = createRemoveLockedBranchesMutation();

	// Mutations for selected branches (to remove when locking) - no need for manual invalidation
	const updateSelectionMutation = createUpdateBranchSelectionBatchMutation();

	// Computed state
	const isLocked = $derived(lockedQuery.data && lockedQuery.data.branches.includes(branch));

	// Handler
	function toggleLock() {
		if (!repositoryID) return;

		if (isLocked) {
			removeLockedMutation.mutate({ repoId: lockedQueryInput.repoId, branchNames: [branch] });
		} else {
			addLockedMutation.mutate({ repoId: lockedQueryInput.repoId, branchNames: [branch] });
			updateSelectionMutation.mutate({
				repoId: lockedQueryInput.repoId,
				branchNames: [branch],
				isSelected: false
			});
		}
	}
</script>

<Button
	size="xs"
	shape="square"
	emphasis={isLocked ? 'primary' : 'secondary'}
	class={css({
		width: '26px',
		height: '26px'
	})}
	passThrough={{
		root: css.raw({
			boxShadow: 'none'
		})
	}}
	onclick={toggleLock}
	data-testid="lock-toggle-button"
	aria-label={formatString('{action} branch {name}', {
		action: isLocked ? 'unlock' : 'lock',
		name: branch
	})}
	{disabled}
>
	{#if isLocked}
		<div data-testid="lock-icon">
			<Icon icon="lucide:lock" width="14px" height="14px" />
		</div>
	{/if}

	{#if !isLocked}
		<div data-testid="unlock-icon">
			<Icon icon="lucide:lock-open" width="14px" height="14px" />
		</div>
	{/if}

	<span class={visuallyHidden()}>
		{formatString('{action} branch {name}', {
			action: isLocked ? 'unlock' : 'lock',
			name: branch
		})}
	</span>
</Button>
