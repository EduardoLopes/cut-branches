<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { MenuNode } from '@pindoba/core-menu';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import Menu from '@pindoba/svelte-menu';
	import Stamp from '@pindoba/svelte-stamp';
	import Tooltip from '@pindoba/svelte-tooltip';
	import type { Snippet } from 'svelte';
	import { useRepositoryActions } from '../core/composables/use-repository-actions.svelte';
	import { useRepositoryWatch } from '../core/composables/use-repository-watch.svelte';
	import RemoveRepositoryModal from './remove-repository-modal.svelte';
	import { createGetRepositoryQuery } from '$infrastructure/queries/create-get-repository-query';
	import PageHeader, { type PageBreadcrumbItem } from '$ui/patterns/page-header.svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		repositoryId: string;
		/**
		 * Extra options-menu actions injected by the composition root (the route),
		 * so features owned by other domains (e.g. repository cleanup) can appear
		 * here without this domain importing them — see §1.3.
		 */
		extraMenuItems?: MenuNode[];
		/**
		 * Context navigation (e.g. Branches / Worktrees) rendered under the
		 * repository name. Provided by the composition root so this domain stays
		 * unaware of the contexts it links to — see §1.3.
		 */
		contextNav?: Snippet;
		/** Ancestor trail for drill-down pages (commit history, diff). */
		breadcrumb?: PageBreadcrumbItem[];
	}

	const { repositoryId, extraMenuItems = [], contextNav, breadcrumb }: Props = $props();

	// Safety net for the active repo: detects (and heals) drift the global
	// watcher may have missed. Exposes `outOfSync` so the manual Update action
	// only appears when the projection is actually behind git.
	const repositoryWatch = useRepositoryWatch(() => repositoryId);

	// Reveal + update actions backing the repository options menu. Update reuses
	// the watcher's refresh so it re-attaches the filesystem watch.
	const repositoryActions = useRepositoryActions(() => repositoryId, {
		onRefresh: () => repositoryWatch.refresh()
	});

	// The Remove action opens this confirmation dialog, which owns the deletion.
	let removeModalOpen = $state(false);

	// The options menu and its trigger tooltip are mutually exclusive: the menu
	// already names the action, so a tooltip on top of it is noise. `openWhen`
	// blocks re-opens while the menu is expanded; the effect dismisses a tooltip
	// that was already showing when the menu opened.
	let menuOpen = $state(false);
	let tooltipOpen = $state(false);

	$effect(() => {
		if (menuOpen) tooltipOpen = false;
	});

	const getRepositoryQuery = createGetRepositoryQuery(() => ({ id: repositoryId }));

	const repositoryName = $derived(getRepositoryQuery.data?.name ?? '');
	const repositoryPath = $derived(getRepositoryQuery.data?.path ?? '');
	// Whether this repository is a linked git worktree (not the main worktree).
	const isWorktree = $derived(getRepositoryQuery.data?.isWorktree ?? false);

	const menuItems = $derived<MenuNode[]>([
		...(repositoryWatch.outOfSync
			? [
					{
						type: 'action',
						id: 'update',
						label: 'Update',
						leading: updateIcon,
						disabled: repositoryActions.isRefreshing,
						onSelect: repositoryActions.update
					} satisfies MenuNode
				]
			: []),
		{
			type: 'action',
			id: 'reveal',
			label: 'Reveal in Finder',
			leading: revealIcon,
			disabled: !repositoryActions.repository,
			onSelect: repositoryActions.reveal
		},
		...extraMenuItems,
		{ type: 'separator', id: 'sep' },
		{
			type: 'action',
			id: 'remove',
			label: 'Remove',
			feedback: 'danger',
			leading: removeIcon,
			onSelect: () => (removeModalOpen = true)
		}
	]);
</script>

{#snippet updateIcon()}
	<Stamp size="sm" emphasis="ghost" border="none" background="transparent">
		<Icon icon="lucide:refresh-cw" width="14px" height="14px" />
	</Stamp>
{/snippet}
{#snippet revealIcon()}
	<Stamp size="sm" emphasis="ghost" border="none" background="transparent">
		<Icon icon="lucide:folder-open" width="14px" height="14px" />
	</Stamp>
{/snippet}
{#snippet removeIcon()}
	<Stamp size="sm" emphasis="ghost" feedback="danger" border="none" background="transparent">
		<Icon icon="lucide:circle-x" width="14px" height="14px" />
	</Stamp>
{/snippet}

{#snippet repositoryIcon()}
	<Stamp shape="square" size="sm" emphasis="ghost" border="none" background="transparent">
		<Icon icon="lucide:folder-git-2" width="16px" height="16px" />
	</Stamp>
{/snippet}

{#snippet heading()}
	<span class={css({ display: 'flex', alignItems: 'center', gap: 'xs', minWidth: '0' })}>
		{#key repositoryName}
			<span
				class={css({
					textTransform: 'uppercase',
					minWidth: '0',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap'
				})}
				data-testid="repository-name"
			>
				{repositoryName}
			</span>
		{/key}

		{#if isWorktree}
			<Badge size="sm" feedback="warning" data-testid="repository-worktree-badge">
				{#snippet leading()}
					<Stamp emphasis="ghost"><Icon icon="lucide:trees" /></Stamp>
				{/snippet}
				worktree
			</Badge>
		{/if}
	</span>
{/snippet}

<!-- Repository options sit as the page's trailing action, so every page reads
     "title on the left, actions on the right" the same way (§4). -->
{#snippet trailing()}
	<Menu
		placement="bottom-end"
		aria-label="Repository options"
		items={menuItems}
		bind:open={menuOpen}
	>
		{#snippet trigger(props)}
			<Tooltip
				content="Repository options"
				placement="bottom"
				openWhen="[aria-expanded=&quot;false&quot;]"
				bind:open={tooltipOpen}
			>
				{#snippet children(tipProps)}
					<Button
						size="sm"
						emphasis="secondary"
						shape="square"
						data-testid="repository-options-button"
						{...props}
						{...tipProps}
					>
						<Stamp emphasis="ghost" border="none" background="transparent">
							<Icon icon="lucide:ellipsis-vertical" width="16px" height="16px" />
						</Stamp>
					</Button>
				{/snippet}
			</Tooltip>
		{/snippet}
	</Menu>
{/snippet}

<PageHeader
	leading={repositoryIcon}
	{heading}
	subheading={repositoryPath || undefined}
	{trailing}
	{breadcrumb}
	nav={contextNav}
/>

<RemoveRepositoryModal {repositoryId} bind:open={removeModalOpen} />
