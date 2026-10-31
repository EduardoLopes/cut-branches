<script lang="ts">
	import type { Snippet } from 'svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** Page chrome and content — typically a `PageHeader` followed by a `PageWell`. */
		children: Snippet;
		/** `data-testid` for the page root. */
		testId?: string;
		/**
		 * Page surface. `peak` (default) for pages whose content sits in a recessed
		 * `PageWell`; `valley` for well-less pages (settings) whose `surface.peak`
		 * cards then lift off the page, Linear-style.
		 */
		background?: 'peak' | 'valley';
	}

	const { children, testId, background = 'peak' }: Props = $props();
</script>

<!--
	The single full-height host every page sits in. Owns the page background and
	the `minHeight: 0` chain that lets the well scroll internally instead of
	stretching the grid column — the thing five hand-written hosts each got
	slightly differently before.
-->
<main
	class={css({
		display: 'flex',
		flexDirection: 'column',
		height: '100%',
		minHeight: '0',
		overflow: 'hidden',
		position: 'relative',
		background: background === 'valley' ? 'neutral.surface.valley' : 'neutral.surface.peak',
		color: 'neutral.text'
	})}
	data-background={background}
	data-testid={testId}
>
	{@render children()}
</main>
