<script lang="ts">
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Dialog from '@pindoba/svelte-dialog';
	import Input from '@pindoba/svelte-input';
	import Loading from '@pindoba/svelte-loading';
	import Panel from '@pindoba/svelte-panel';
	import Stamp from '@pindoba/svelte-stamp';
	import { SvelteSet } from 'svelte/reactivity';
	import { useRemoveRepositoryBatch } from '../core/composables/use-remove-repository-batch.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { createGetRepositoryListQuery } from '$infrastructure/queries/create-get-repository-list-query';
	import { resolveRepositoryPath } from '$lib/repository-route';
	import ValidationHint from '$ui/patterns/validation-hint.svelte';
	import { portal } from '$utils/portal-action';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** Bindable visibility, controlled by the repository menu. */
		open?: boolean;
	}

	let { open = $bindable(false) }: Props = $props();

	const repositoriesQuery = createGetRepositoryListQuery();
	const repositories = $derived(repositoriesQuery.data ?? []);

	// Free-text filter over name and path.
	let searchQuery = $state('');
	const query = $derived(searchQuery.trim().toLowerCase());
	const filteredRepositories = $derived(
		query
			? repositories.filter(
					(repository) =>
						repository.name.toLowerCase().includes(query) ||
						repository.path.toLowerCase().includes(query)
				)
			: repositories
	);

	// The ids the user has ticked for removal.
	const selected = new SvelteSet<string>();

	let hintOpen = $state(false);

	const selectedCount = $derived(selected.size);

	// Clear the validation hint once the user selects a repository.
	$effect(() => {
		if (hintOpen && selectedCount > 0) {
			hintOpen = false;
		}
	});
	// Select-all reflects the currently visible (filtered) rows.
	const allSelected = $derived(
		filteredRepositories.length > 0 &&
			filteredRepositories.every((repository) => selected.has(repository.id))
	);
	const someSelected = $derived(
		filteredRepositories.some((repository) => selected.has(repository.id)) && !allSelected
	);

	const removeBatch = useRemoveRepositoryBatch({
		onComplete: ({ removedIds, failedIds }) => {
			// Untick only what actually went away. The repositories that failed stay
			// in the list, so dropping them from the selection too would hide which
			// ones the user still has to deal with.
			for (const id of removedIds) {
				selected.delete(id);
			}

			if (removedIds.length > 0) {
				// If the repository currently open was removed, leave its (now dead)
				// route for a surviving repo, or the repos index when none remain.
				const activeId = page.params.id;
				if (activeId && removedIds.includes(activeId)) {
					const survivor = repositories.find((repository) => !removedIds.includes(repository.id));
					if (survivor) {
						goto(resolveRepositoryPath(survivor.id));
					} else {
						goto(resolve('/repos'));
					}
				}
			}

			// A partial failure is not a finished job: keep the modal open (and the
			// failed rows ticked) so the user can read the error and retry.
			if (failedIds.length > 0) {
				return;
			}

			reset();
			open = false;
		}
	});

	function reset() {
		selected.clear();
		searchQuery = '';
		hintOpen = false;
	}

	function toggle(id: string) {
		if (selected.has(id)) {
			selected.delete(id);
		} else {
			selected.add(id);
		}
	}

	function toggleAll() {
		// Decide once up front: reading the reactive `allSelected` inside the loop
		// would flip mid-iteration as we mutate `selected`, inverting the action.
		const shouldSelectAll = !allSelected;
		for (const repository of filteredRepositories) {
			if (shouldSelectAll) {
				selected.add(repository.id);
			} else {
				selected.delete(repository.id);
			}
		}
	}

	function handleRemove() {
		if (selectedCount === 0) {
			hintOpen = true;
			return;
		}
		// The composable reports failures by name, so it needs more than the ids.
		removeBatch.removeBatch(
			repositories
				.filter((repository) => selected.has(repository.id))
				.map((repository) => ({ id: repository.id, name: repository.name }))
		);
	}

	function handleCancel() {
		reset();
		open = false;
	}

	function handleOpenChange(next: boolean) {
		if (!next) {
			reset();
		}
		open = next;
	}
</script>

<div use:portal>
	<Dialog
		{open}
		onChange={handleOpenChange}
		title="Manage repositories"
		aria-label="Manage repositories"
		data-testid="manage-repositories-modal"
		passThrough={{
			root: {
				style: css.raw({
					width: '560px',
					maxWidth: 'calc(100vw - token(spacing.2xl))'
				})
			}
		}}
	>
		<div
			class={css({
				display: 'flex',
				flexDirection: 'column',
				gap: 'lg',
				width: 'full'
			})}
		>
			<p class={css({ margin: '0', color: 'neutral.text.muted', fontSize: 'sm' })}>
				Select the repositories to remove from Cut Branches. This only removes them from the app —
				the folders on disk are left untouched.
			</p>

			{#if repositories.length > 0}
				<Input
					type="search"
					size="md"
					placeholder="Search repositories"
					aria-label="Search repositories"
					bind:value={searchQuery}
					data-testid="manage-search"
				>
					{#snippet leading()}
						<Stamp emphasis="ghost" border="none" background="transparent">
							<Icon icon="lucide:search" width="16px" height="16px" />
						</Stamp>
					{/snippet}
				</Input>
			{/if}

			<Panel
				background="surface.peak"
				border="muted"
				radius="lg"
				padding="none"
				class={css({
					display: 'flex',
					flexDirection: 'column',
					height: '320px',
					overflow: 'hidden'
				})}
			>
				{#if repositories.length === 0}
					<div
						class={css({
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 'sm',
							flex: '1',
							textAlign: 'center',
							color: 'neutral.text.muted'
						})}
						data-testid="manage-empty"
					>
						<Stamp shape="circle" size="lg" emphasis="secondary" feedback="neutral">
							<Icon icon="lucide:folder-git-2" width="20px" height="20px" />
						</Stamp>
						<span class={css({ fontSize: 'sm' })}>No repositories to manage.</span>
					</div>
				{:else if filteredRepositories.length === 0}
					<div
						class={css({
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 'sm',
							flex: '1',
							textAlign: 'center',
							color: 'neutral.text.muted'
						})}
						data-testid="manage-no-matches"
					>
						<Stamp shape="circle" size="lg" emphasis="secondary" feedback="neutral">
							<Icon icon="lucide:search-x" width="20px" height="20px" />
						</Stamp>
						<span class={css({ fontSize: 'sm' })}>No repositories match your search.</span>
					</div>
				{:else}
					<!-- Header with the select-all control -->
					<div
						class={css({
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							paddingX: 'sm',
							paddingY: 'xs',
							borderBottomWidth: '1px',
							borderBottomStyle: 'solid',
							borderBottomColor: 'neutral.border.muted',
							background: 'neutral.surface.hill'
						})}
					>
						<Checkbox
							id="manage-select-all"
							checked={allSelected}
							indeterminate={someSelected}
							onchange={toggleAll}
							data-testid="manage-select-all"
						>
							Select all
						</Checkbox>
						<span
							class={css({ fontSize: 'xs', color: 'neutral.text.muted' })}
							data-testid="manage-selected-count"
						>
							{selectedCount} of {repositories.length} selected
						</span>
					</div>

					<!-- Rows. A transparent Panel rather than a plain div so this
					     scroller's inset counts as a nesting level and the rows can ask
					     for `radius="inner"` instead of pinning a tier. -->
					<Panel
						background="transparent"
						border="none"
						radius="inner"
						padding="2xs"
						class={css({
							display: 'flex',
							flexDirection: 'column',
							gap: '3xs',
							flex: '1',
							overflowY: 'auto',
							// Only the list scrolls vertically; long repo paths ellipsize
							// rather than pushing the row wide and adding a horizontal bar.
							overflowX: 'hidden'
						})}
					>
						{#each filteredRepositories as repository (repository.id)}
							{@const isSelected = selected.has(repository.id)}
							<Checkbox
								fullWidth
								checked={isSelected}
								onchange={() => toggle(repository.id)}
								aria-label={repository.name}
								data-testid="manage-item"
								radius="inner"
								class={css({
									paddingX: 'sm',
									paddingY: 'xs',
									// Let the row shrink to the well's width so its content can
									// ellipsize instead of forcing horizontal overflow.
									minWidth: '0',
									maxWidth: 'full',
									background: isSelected ? 'danger.surface.peak' : 'transparent',
									_hover: {
										background: isSelected ? 'danger.surface' : 'neutral.surface.hill'
									}
								})}
							>
								<span
									class={css({
										display: 'flex',
										flexDirection: 'column',
										gap: '2xs',
										minWidth: '0',
										width: 'full'
									})}
								>
									<span class={css({ fontSize: 'sm', fontWeight: 'medium' })}
										>{repository.name}</span
									>
									<span
										class={css({
											fontSize: 'xs',
											color: 'neutral.text.muted',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap'
										})}
									>
										{repository.path}
									</span>
								</span>
								{#snippet trailing()}
									<Badge size="sm" emphasis="secondary">
										{repository.branchesCount}
										{repository.branchesCount === 1 ? 'branch' : 'branches'}
									</Badge>
								{/snippet}
							</Checkbox>
						{/each}
					</Panel>
				{/if}
			</Panel>

			<!-- Footer -->
			<div
				class={css({
					display: 'flex',
					justifyContent: 'flex-end',
					gap: 'sm',
					paddingTop: 'md',
					borderTopWidth: '1px',
					borderTopStyle: 'solid',
					borderTopColor: 'neutral.border.muted'
				})}
			>
				<Button emphasis="ghost" onclick={handleCancel} data-testid="manage-cancel">Cancel</Button>
				<ValidationHint
					bind:open={hintOpen}
					message="Select at least one repository to remove."
					data-testid="manage-remove-validation"
				>
					{#snippet trigger(triggerProps)}
						<Loading loading={removeBatch.isPending} variant="busy" indicator>
							<Button
								{...triggerProps}
								feedback="danger"
								onclick={handleRemove}
								data-testid="manage-remove-selected"
							>
								Remove {selectedCount}
								{selectedCount === 1 ? 'repository' : 'repositories'}
							</Button>
						</Loading>
					{/snippet}
				</ValidationHint>
			</div>
		</div>
	</Dialog>
</div>
