<script lang="ts">
	import type { Snippet } from 'svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** One or more rows of controls. */
		children: Snippet;
		testId?: string;
	}

	let { children, testId }: Props = $props();
</script>

<!--
	A second header row for dialog-level controls (where to look, what to
	include). It bleeds over the Dialog content's `md` inset with negative
	margins so it sits flush under the header border and spans the full width,
	then restores the inset for its own contents. Place it first in the body.
-->
<div
	class={css({
		display: 'flex',
		flexDirection: 'column',
		gap: 'xs',
		marginX: 'calc(token(spacing.md) * -1)',
		marginTop: 'calc(token(spacing.md) * -1)',
		paddingX: 'md',
		paddingY: 'sm',
		borderBottomWidth: '1px',
		borderBottomStyle: 'solid',
		borderBottomColor: 'neutral.border.muted',
		background: 'neutral.surface.hill'
	})}
	data-testid={testId}
>
	{@render children()}
</div>
