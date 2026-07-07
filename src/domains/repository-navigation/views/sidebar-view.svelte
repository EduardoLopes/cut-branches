<script lang="ts">
	import Icon from '@iconify/svelte';
	import Navigation, { type NavigationItem } from '@pindoba/svelte-navigation';
	import Stamp from '@pindoba/svelte-stamp';
	import { type Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import RepositoryNavList from '$domains/repository-navigation/components/repository-nav-list.svelte';
	import SidebarBrand from '$domains/repository-navigation/components/sidebar-brand.svelte';
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

	// Highlight the Settings entry while on the settings route.
	const settingsActiveItem = $derived(
		page.url?.pathname?.startsWith('/settings') ? 'settings' : undefined
	);

	// App-level navigation (settings and future global entries), reusing the same
	// Navigation component as the repository list so it gets collapse + tooltips.
	const appNavItems = $derived<NavigationItem[]>([
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

<section
	class={css({
		display: 'flex',
		flexDirection: 'column',
		minHeight: 0,
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
			activeItem={settingsActiveItem}
			direction="vertical"
			emphasis="neutral"
			background="transparent"
			compact={collapsed ? 'stack' : 'none'}
			passThrough={{ root: { style: css.raw({ width: collapsed ? 'fit-content' : '100%' }) } }}
		/>
	</div>
</section>
