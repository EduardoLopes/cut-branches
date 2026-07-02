<script lang="ts">
	import { type Snippet } from 'svelte';
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
</script>

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
	<RepositoryNavList headerAction={repositoryListAction} compact={collapsed ? 'icon' : 'none'} />
</section>
