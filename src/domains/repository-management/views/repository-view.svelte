<script lang="ts">
	import type { Snippet } from 'svelte';
	import RepositoryHeader from '../components/repository-header.svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		children?: Snippet;
		repositoryId: string;
	}

	const { children, repositoryId }: Props = $props();
</script>

<div
	class={css({
		overflow: 'hidden',
		position: 'relative',
		height: 'calc(100vh - 30px)'
	})}
>
	<main
		class={css({
			display: 'flex',
			flexDirection: 'column',
			overflow: 'hidden',
			position: 'relative',
			height: '100%',
			background: 'neutral.surface.step.1'
		})}
	>
		<RepositoryHeader {repositoryId} />
		{#if children}
			{@render children()}
		{/if}
	</main>
</div>
