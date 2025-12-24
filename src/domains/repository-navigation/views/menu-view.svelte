<script lang="ts">
	import AppHeader from '$domains/repository-navigation/components/app-header.svelte';
	import RepositoryList from '$domains/repository-navigation/components/repository-list.svelte';
	import { css } from '@pindoba/styled-system/css';
</script>

<section
	class={css({
		display: 'grid',
		gridTemplateRows: 'min-content auto min-content',
		background: 'neutral.background.surface',
		boxShadow: 'inset -1px 0 0px 0px token(colors.neutral.border)'
	})}
>
	<AppHeader />
	<RepositoryList />
</section>
