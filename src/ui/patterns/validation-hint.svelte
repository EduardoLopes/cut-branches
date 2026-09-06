<script lang="ts">
	import Alert from '@pindoba/svelte-alert';
	import Popover, { type PopoverProps, type TriggerSnippetProps } from '@pindoba/svelte-popover';
	import type { Snippet } from 'svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/**
		 * Whether the hint is visible. Bindable so the caller can clear it once the
		 * validation requirement is satisfied (or on dismiss).
		 */
		open?: boolean;
		/** The validation message shown inside the hint. */
		message: string;
		/** Where the hint floats relative to its trigger. */
		placement?: PopoverProps['placement'];
		/**
		 * The action element the hint anchors to. Spread the received props onto
		 * your `<Button>` so the popover can position against it, and drive `open`
		 * from the button's own click handler.
		 */
		trigger: Snippet<[TriggerSnippetProps]>;
		/** Forwarded to the inner Alert to make the message queryable in tests. */
		'data-testid'?: string;
	}

	let {
		open = $bindable(false),
		message,
		placement = 'top',
		trigger,
		'data-testid': testId
	}: Props = $props();

	// Manual trigger strategy wires no dismissal, so close on any click that
	// lands outside the popover surface and its trigger. The popover dialog
	// carries `data-popover`; the trigger carries `data-popover-trigger`.
	// Clicking the trigger itself is governed by the trigger's own handler.
	$effect(() => {
		if (!open) return;

		function handlePointerDown(event: PointerEvent) {
			const target = event.target;
			if (!(target instanceof Element)) return;
			if (target.closest('[data-popover], [data-popover-trigger]')) return;
			open = false;
		}

		document.addEventListener('pointerdown', handlePointerDown, true);
		return () => document.removeEventListener('pointerdown', handlePointerDown, true);
	});
</script>

<!--
	The message lives in a popover so it floats above the layout instead of
	pushing sibling content around. The popover itself is chrome-less
	(no border/padding/background) and non-blocking — the visible box is the
	Alert, and the user can keep interacting with the page to fix the issue.
	The Dialog `content` slot hardcodes its own padding, so it is zeroed via
	passThrough. Focus is left on the trigger (`autoFocus={false}`) — a hint
	should not steal focus from the action the user just attempted.
-->
<Popover
	bind:open
	{trigger}
	{placement}
	triggerStrategy="manual"
	isModal={false}
	lockScroll={false}
	autoFocus={false}
	border="none"
	padding="none"
	background="transparent"
	fitContentWidth
	passThrough={{ content: { style: css.raw({ padding: '0' }) } }}
	onClose={() => (open = false)}
>
	<Alert feedback="danger" emphasis="secondary" data-testid={testId}>
		{message}
	</Alert>
</Popover>
