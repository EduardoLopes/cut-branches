<script lang="ts">
	import type { Snippet } from 'svelte';
	import { css, cx } from '@pindoba/styled-system/css';

	interface Props {
		/** The action buttons, in reading order (dismiss first, primary last). */
		children: Snippet;
		class?: string;
		testId?: string;
	}

	let { children, class: className, testId }: Props = $props();
</script>

<!--
	Dialog actions: right-aligned, no divider. The dialog body's own gap sets the
	footer apart; a rule above the buttons only fenced them off from content
	that already ends on its own.
-->
<div
	class={cx(css({ display: 'flex', justifyContent: 'flex-end', gap: 'sm' }), className)}
	data-testid={testId}
>
	{@render children()}
</div>
