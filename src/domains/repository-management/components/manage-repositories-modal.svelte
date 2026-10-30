<script lang="ts">
	import LucideFolderGit2 from '@lucide/svelte/icons/folder-git-2';
	import LucideSearchX from '@lucide/svelte/icons/search-x';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import Dialog from '@pindoba/svelte-dialog';
	import GridList from '@pindoba/svelte-grid-list';
	import Loading from '@pindoba/svelte-loading';
	import Stamp from '@pindoba/svelte-stamp';
	import { SvelteSet } from 'svelte/reactivity';
	import { useRemoveRepositoryBatch } from '../core/composables/use-remove-repository-batch.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Repository } from '$infrastructure/bindings';
	import { createGetRepositoryListQuery } from '$infrastructure/queries/create-get-repository-list-query';
	import { resolveRepositoryPath } from '$lib/repository-route';
	import Icon from '$ui/core/icon.svelte';
	import TruncatedPath from '$ui/core/truncated-path.svelte';
	import DialogFooter from '$ui/patterns/dialog-footer.svelte';
	import DialogHeader from '$ui/patterns/dialog-header.svelte';
	import ListFilter from '$ui/patterns/list-filter.svelte';
	import ScrollWell from '$ui/patterns/scroll-well.svelte';
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

	// GridList adopts a new `value` by identity, so hand it a fresh Set.
	const selectedIds = $derived(new Set(selected));

	function setSelection(next: Set<string>) {
		selected.clear();
		for (const id of next) selected.add(id);
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

	const nameClass = css({ fontSize: 'sm', fontWeight: 'medium', whiteSpace: 'nowrap' });
	const pathClass = css({ fontSize: 'xs', minWidth: '0' });

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
		onOpenChange={handleOpenChange}
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
		{#snippet header()}
			<DialogHeader
				title="Manage repositories"
				subtitle="Select the repositories to remove from Cut Branches. This only removes them from the app — the folders on disk are left untouched."
				icon={LucideFolderGit2}
			/>
		{/snippet}

		<div
			class={css({
				display: 'flex',
				flexDirection: 'column',
				gap: 'lg',
				width: 'full'
			})}
		>
			<!-- Results (fixed height so the modal doesn't resize between states) -->
			<div
				class={css({
					display: 'flex',
					flexDirection: 'column',
					gap: 'sm',
					height: '320px'
				})}
			>
				{#if repositories.length > 0}
					<ListFilter
						bind:value={searchQuery}
						placeholder="Search repositories"
						matchCount={filteredRepositories.length}
						total={repositories.length}
						testId="manage-search"
					/>
				{/if}

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
						<Stamp shape="circle" size="lg" emphasis="secondary" tone="neutral">
							<Icon icon={LucideFolderGit2} width="20px" height="20px" />
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
						<Stamp shape="circle" size="lg" emphasis="secondary" tone="neutral">
							<Icon icon={LucideSearchX} width="20px" height="20px" />
						</Stamp>
						<span class={css({ fontSize: 'sm' })}>No repositories match your search.</span>
					</div>
				{:else if open}
					<!-- Only while open: pindoba's Dialog renders its children into the
					     closed <dialog> too, and this is a row per repository.
					     The list's own sticky header carries select-all (it covers the
					     rows the filter leaves, and keeps ticks on hidden ones). The
					     well's scroller has no top padding, so the header pins flush. -->
					<ScrollWell
						class={css({ flex: '1', minHeight: '0' })}
						scrollerClass={css({ paddingTop: '0' })}
						testId="manage-list"
					>
						<GridList
							label="Repositories"
							items={filteredRepositories}
							getId={(repository: Repository) => repository.id}
							rowName={(repository: Repository) => repository.name}
							selectable
							header
							value={selectedIds}
							onValueChange={setSelection}
							tone="danger"
							look="cards"
							rowBackground="surface.peak"
							columns={[
								{ id: 'name', track: 'auto', header: 'Repository' },
								{ id: 'path', track: 'minmax(0, 1fr)', header: 'Path' },
								{ id: 'branches', track: 'auto', header: 'Branches' }
							]}
						>
							{#snippet row(repository, { cell })}
								<span {...cell('name', { class: nameClass })} data-testid="manage-item">
									{repository.name}
								</span>
								<span {...cell('path')}>
									<TruncatedPath
										path={repository.path}
										highlight={repository.name}
										align="end"
										class={pathClass}
										data-testid="manage-item-path"
									/>
								</span>
								<span {...cell('branches')}>
									<Badge size="sm" emphasis="secondary">
										{repository.branchesCount}
										{repository.branchesCount === 1 ? 'branch' : 'branches'}
									</Badge>
								</span>
							{/snippet}
						</GridList>
					</ScrollWell>
				{/if}
			</div>

			<DialogFooter>
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
								tone="danger"
								onclick={handleRemove}
								disabled={removeBatch.isPending}
								data-testid="manage-remove-selected"
							>
								Remove {selectedCount}
								{selectedCount === 1 ? 'repository' : 'repositories'}
							</Button>
						</Loading>
					{/snippet}
				</ValidationHint>
			</DialogFooter>
		</div>
	</Dialog>
</div>
