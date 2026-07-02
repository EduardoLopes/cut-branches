<script lang="ts">
	import { type Snippet } from 'svelte';
	import AppHeader from '$domains/repository-navigation/components/app-header.svelte';
	import RepositoryList from '$domains/repository-navigation/components/repository-list.svelte';
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
	<AppHeader {collapsed} onToggle={toggleSidebar} />
	<RepositoryList headerAction={repositoryListAction} compact={collapsed ? 'icon' : 'none'} />
</section>
