<script lang="ts">
	import { type Snippet } from 'svelte';
	import AppHeader from '$domains/repository-navigation/components/app-header.svelte';
	import RepositoryList from '$domains/repository-navigation/components/repository-list.svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		repositoryListAction?: Snippet<[]>;
	}

	const { repositoryListAction }: Props = $props();
</script>

<section
	class={css({
		display: 'grid',
		gridTemplateRows: 'min-content auto min-content',
		background: 'neutral.surface.soft',
		borderRightWidth: '1px',
		borderRightStyle: 'solid',
		borderRightColor: 'neutral.border.muted'
	})}
>
	<AppHeader />
	<RepositoryList headerAction={repositoryListAction} />
</section>
