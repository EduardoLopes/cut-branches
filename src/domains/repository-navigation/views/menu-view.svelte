<script lang="ts">
	import { css } from '@pindoba/styled-system/css';
	import AppHeader from '$domains/repository-navigation/components/app-header.svelte';
	import RepositoryList from '$domains/repository-navigation/components/repository-list.svelte';
</script>

<section
	class={css({
		display: 'grid',
		gridTemplateRows: 'min-content auto min-content'
	})}
>
	<AppHeader />
	<RepositoryList />
</section>
