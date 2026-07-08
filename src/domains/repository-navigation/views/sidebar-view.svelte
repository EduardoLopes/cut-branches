<script lang="ts">
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Navigation, { type NavigationItem } from '@pindoba/svelte-navigation';
	import Stamp from '@pindoba/svelte-stamp';
	import { type Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import RepositoryNavList from '$domains/repository-navigation/components/repository-nav-list.svelte';
	import SidebarBrand from '$domains/repository-navigation/components/sidebar-brand.svelte';
	import { cleanupSummary } from '$lib/cleanup-summary.svelte';
	import { isFeatureEnabled } from '$lib/feature-flags.svelte';
	import { formatBytes } from '$utils/format-bytes';
	import { getLocalStorage } from '$utils/get-local-storage';
	import { setLocalStorage } from '$utils/set-local-storage';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		repositoryListAction?: Snippet<[]>;
	}

	const { repositoryListAction }: Props = $props();

	const STORAGE_KEY = 'sidebar-collapsed';

	// Collapsed rail is delivery-layer UI state, persisted across sessions.
	let collapsed = $state<boolean>(getLocalStorage<boolean>(STORAGE_KEY, false) === true);

	function toggleSidebar() {
		collapsed = !collapsed;
		setLocalStorage(STORAGE_KEY, collapsed);
	}

	// Highlight the active app-nav entry based on the current route.
	const appActiveItem = $derived(
		page.url?.pathname?.startsWith('/settings')
			? 'settings'
			: page.url?.pathname?.startsWith('/cleanup')
				? 'cleanup'
				: undefined
	);

	// App-level navigation (settings and future global entries), reusing the same
	// Navigation component as the repository list so it gets collapse + tooltips.
	// The cleanup entry is feature-flag gated.
	// Reclaimable space from the latest background scan; drives the badge.
	const reclaimableBytes = $derived(cleanupSummary.reclaimableBytes ?? 0);

	const appNavItems = $derived<NavigationItem[]>([
		...(isFeatureEnabled('repository-cleanup')
			? [
					{
						id: 'cleanup',
						label: 'Clean up',
						href: resolve('/cleanup'),
						leading: cleanupIcon as NavigationItem['leading'],
						trailing:
							!collapsed && reclaimableBytes > 0
								? (cleanupBadge as NavigationItem['trailing'])
								: undefined,
						'data-testid': 'sidebar-cleanup'
					}
				]
			: []),
		{
			id: 'settings',
			label: 'Settings',
			href: resolve('/settings'),
			leading: settingsIcon as NavigationItem['leading'],
			'data-testid': 'sidebar-settings'
		}
	]);
</script>

{#snippet settingsIcon()}
	<Stamp size="sm" shape="square" emphasis="ghost" background="transparent" border="none">
		<Icon icon="lucide:settings" />
	</Stamp>
{/snippet}
{#snippet cleanupIcon()}
	<Stamp size="sm" shape="square" emphasis="ghost" background="transparent" border="none">
		<Icon icon="lucide:brush-cleaning" />
	</Stamp>
{/snippet}
{#snippet cleanupBadge()}
	<Badge size="sm" emphasis="adaptive" data-testid="sidebar-cleanup-badge">
		{formatBytes(reclaimableBytes)}
	</Badge>
{/snippet}

<section
	class={css({
		display: 'flex',
		flexDirection: 'column',
		height: '100%',
		minHeight: 0,
		overflow: 'hidden',
		background: 'neutral.surface.soft',
		borderRightWidth: '1px',
		borderRightStyle: 'solid',
		borderRightColor: 'neutral.border.muted'
	})}
>
	<SidebarBrand {collapsed} onToggle={toggleSidebar} />
	<RepositoryNavList headerAction={repositoryListAction} compact={collapsed ? 'stack' : 'none'} />

	<div
		class={css({
			marginTop: 'auto',
			display: 'flex',
			px: 'md',
			py: 'sm',
			background: 'neutral.surface.step.1',
			borderTopWidth: '1px',
			borderTopStyle: 'solid',
			borderTopColor: 'neutral.border.muted'
		})}
		style:justify-content={collapsed ? 'center' : 'flex-start'}
	>
		<Navigation
			items={appNavItems}
			activeItem={appActiveItem}
			direction="vertical"
			emphasis="neutral"
			background="transparent"
			compact={collapsed ? 'stack' : 'none'}
			passThrough={{ root: { style: css.raw({ width: collapsed ? 'fit-content' : '100%' }) } }}
		/>
	</div>
</section>
