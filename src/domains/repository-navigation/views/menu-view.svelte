<script lang="ts">
	import AppHeader from '$domains/repository-navigation/components/app-header.svelte';
	import RepositoryList from '$domains/repository-navigation/components/repository-list.svelte';
	import { css } from '@pindoba/panda/css';
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
