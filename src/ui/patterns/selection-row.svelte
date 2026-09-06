<script lang="ts">
	import Checkbox from '@pindoba/svelte-checkbox';
	import type { ComponentProps, Snippet } from 'svelte';
	import { css, cx } from '@pindoba/styled-system/css';

	interface Props {
		checked: boolean;
		disabled?: boolean;
		onchange: () => void;
		/**
		 * Which surface ladder a selected row climbs. `danger` is for lists whose
		 * action destroys the selection (e.g. removing repositories).
		 * @default 'neutral'
		 */
		feedback?: 'neutral' | 'danger';
		/**
		 * The "already handled" look: no lift when checked and no hover or
		 * pressed step. Pair it with `disabled`, which dims the row.
		 * @default false
		 */
		muted?: boolean;
		/** @default 'sm' — concentric with a ScrollWell's `md` corner and `2xs` inset. */
		radius?: ComponentProps<typeof Checkbox>['radius'];
		ariaLabel?: string;
		testId?: string;
		class?: string;
		/** Row body — name, badges, path. Gets the free width. */
		children: Snippet;
		/** End-pinned addon, e.g. an "Added" badge. */
		trailing?: Snippet;
	}

	let {
		checked,
		disabled = false,
		onchange,
		feedback = 'neutral',
		muted = false,
		radius = 'sm',
		ariaLabel,
		testId,
		class: className,
		children,
		trailing
	}: Props = $props();
</script>

<!--
	A full-width checkbox row for pick-lists. The `checkbox` appearance is a
	non-interactive Panel, so the row states are drawn here, following pindoba's
	checked-tertiary stepping: selected lifts to the dialog's own surface
	(peak), hover steps one down to hill from either side, press settles on
	base. Padding uses longhands on purpose: the Checkbox root is a Panel with
	`padding="none"`, whose atomic `padding: 0` is emitted after `.p_*` in the
	sheet and would beat the shorthand.
-->
<Checkbox
	fullWidth
	{checked}
	{disabled}
	{onchange}
	{radius}
	aria-label={ariaLabel}
	data-testid={testId}
	{trailing}
	passThrough={{ text: { style: css.raw({ flex: '1', minWidth: '0' }) } }}
	class={cx(
		css({
			minWidth: '0',
			paddingX: 'sm',
			paddingY: 'sm',
			background:
				checked && !muted
					? feedback === 'danger'
						? 'danger.surface.peak'
						: 'neutral.surface.peak'
					: 'transparent',
			_hover: {
				background: muted
					? undefined
					: checked && feedback === 'danger'
						? 'danger.surface.hill'
						: 'neutral.surface.hill'
			},
			_active: {
				background: muted
					? undefined
					: checked && feedback === 'danger'
						? 'danger.surface.base'
						: 'neutral.surface.base'
			}
		}),
		className
	)}
>
	{@render children()}
</Checkbox>
