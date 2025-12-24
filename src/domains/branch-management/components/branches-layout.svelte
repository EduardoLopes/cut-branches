<script lang="ts">
	import Loading from '@pindoba/svelte-loading';
	import type { Snippet } from 'svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		isLoading: boolean;
		children: Snippet;
	}

	const { isLoading, children }: Props = $props();
</script>

<Loading
	{isLoading}
	fillParent
	passThrough={{
		root: {
			style: css.raw({
				borderRadius: '0',
				flexGrow: '1',
				height: 'calc(100% - 93px)',
				background: 'neutral.background.surface',
				px: 'md',
				pb: 'md'
			})
		},
		overlay: {
			style: css.raw({
				borderRadius: '0',
				border: 'none'
			})
		},
		content: {
			style: css.raw({
				display: 'flex',
				flexGrow: '1',
				flexDirection: 'column',
				width: '100%',
				height: 'auto',
				overflowY: 'auto',
				overflowX: 'hidden',
				borderRadius: 'md',
				borderTopLeftRadius: 0,
				border: '1px solid token(colors.neutral.border)'
			})
		}
	}}
>
	{@render children()}
</Loading>
