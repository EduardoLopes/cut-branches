<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { MenuNode } from '@pindoba/core-menu';
	import Button, { type ButtonProps } from '@pindoba/svelte-button';
	import Group from '@pindoba/svelte-group';
	import Loading from '@pindoba/svelte-loading';
	import Menu from '@pindoba/svelte-menu';
	import Stamp from '@pindoba/svelte-stamp';
	import { useAddRepository } from '../core/composables/use-add-repository.svelte';
	import ScanRepositoriesModal from './scan-repositories-modal.svelte';
	import type { CreateRepositoryOutput } from '$infrastructure/bindings';
	import {
		REPOSITORY_SORT_OPTIONS,
		repositorySort,
		type RepositorySortMode
	} from '$lib/repository-sort.svelte';
	import { css } from '@pindoba/styled-system/css';
	import { visuallyHidden } from '@pindoba/styled-system/patterns';

	interface Props extends ButtonProps {
		icon?: string;
		/** Renders the primary button as an icon-only (compact) control. */
		visuallyHiddenLabel?: boolean;
		/**
		 * Appends a "Sort repositories" section to the dropdown that drives the
		 * shared repository-navigation ordering. Only meaningful where the sidebar
		 * list is visible.
		 */
		withRepositorySort?: boolean;
		onSuccess?: (data: CreateRepositoryOutput) => void;
	}

	const {
		size = 'lg',
		emphasis = 'primary',
		icon = 'material-symbols:add-circle-outline-rounded',
		visuallyHiddenLabel = false,
		withRepositorySort = false,
		onSuccess,
		...props
	}: Props = $props();

	// The base add/scan actions, optionally followed by a divider and the shared
	// repository-sort radio group (§1.5 cross-domain seam via `$lib`).
	const menuItems = $derived.by<MenuNode[]>(() => {
		const base: MenuNode[] = [
			{
				type: 'action',
				id: 'scan-home',
				label: 'Scan this computer',
				leading: scanIcon,
				onSelect: () => openScan('home')
			},
			{
				type: 'action',
				id: 'scan-folder',
				label: 'Scan a specific folder…',
				leading: folderIcon,
				onSelect: () => openScan('folder')
			}
		];

		if (!withRepositorySort) {
			return base;
		}

		return [
			...base,
			{ type: 'separator', id: 'repository-sort-separator' },
			{
				type: 'radiogroup',
				id: 'repository-sort',
				label: 'Sort repositories',
				value: repositorySort.mode,
				items: REPOSITORY_SORT_OPTIONS.map((option) => ({
					type: 'radio',
					id: `repository-sort-${option.id}`,
					label: option.label,
					value: option.id
				})),
				onValueChange: (value: string) => repositorySort.setMode(value as RepositorySortMode)
			}
		];
	});

	const addRepo = useAddRepository({ onSuccess });

	let scanOpen = $state(false);
	let scanScope = $state<'home' | 'folder'>('home');

	function openScan(scope: 'home' | 'folder') {
		scanScope = scope;
		scanOpen = true;
	}
</script>

{#snippet scanIcon()}
	<Stamp size="sm" emphasis="ghost" border="none" background="transparent">
		<Icon icon="lucide:radar" width="14px" height="14px" />
	</Stamp>
{/snippet}
{#snippet folderIcon()}
	<Stamp size="sm" emphasis="ghost" border="none" background="transparent">
		<Icon icon="lucide:folder-search" width="14px" height="14px" />
	</Stamp>
{/snippet}

<Loading
	loading={addRepo.isPending}
	passThrough={{ root: { style: css.raw({ width: 'fit-content' }) } }}
>
	<Group orientation="horizontal">
		{#if visuallyHiddenLabel}
			<Button onclick={addRepo.addFromDialog} shape="square" {size} {emphasis} {...props}>
				<Stamp emphasis="ghost" border="none" background="transparent">
					<Icon {icon} width="20px" height="20px" data-testid="add-button-icon" />
				</Stamp>
				<span class={visuallyHidden()}>Add a git repository</span>
			</Button>
		{:else}
			<Button onclick={addRepo.addFromDialog} {size} {emphasis} {...props}>
				Add a git repository
				{#snippet trailing()}
					<Stamp emphasis="ghost" border="none" background="transparent">
						<Icon {icon} width="20px" height="20px" data-testid="add-button-icon" />
					</Stamp>
				{/snippet}
			</Button>
		{/if}

		<Menu placement="bottom-end" aria-label="Add repository options" items={menuItems}>
			{#snippet trigger(triggerProps)}
				<Button
					{size}
					{emphasis}
					shape="square"
					aria-label="More add options"
					data-testid="add-repository-menu-trigger"
					{...triggerProps}
				>
					<Stamp emphasis="ghost" border="none" background="transparent">
						<Icon icon="lucide:chevron-down" width="18px" height="18px" />
					</Stamp>
				</Button>
			{/snippet}
		</Menu>
	</Group>
</Loading>

<ScanRepositoriesModal bind:open={scanOpen} scope={scanScope} />
