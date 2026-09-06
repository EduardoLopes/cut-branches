<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button, { type ButtonProps } from '@pindoba/svelte-button';
	import Stamp from '@pindoba/svelte-stamp';
	import { css } from '@pindoba/styled-system/css';
	import { visuallyHidden } from '@pindoba/styled-system/patterns';

	interface Props extends ButtonProps {
		icon: string;
		label: string;
		visuallyHiddenLabel?: boolean;
		/**
		 * Optional second icon cross-faded in place of `icon` while `swapped` is
		 * true. Both icons stay in the DOM (one absolutely overlaid), so the swap
		 * animates in both directions instead of hard-cutting — use it for
		 * state-change icons (open/close, play/pause).
		 */
		swapIcon?: string;
		/** Shows `swapIcon` instead of `icon`. Only meaningful with `swapIcon`. */
		swapped?: boolean;
		/**
		 * Glyph size. The 20px default suits `md` and up; smaller controls need it
		 * lowered explicitly, because a glyph wider than the control's inner box
		 * silently pushes the button past its nominal height (`xs` is a 2rem
		 * control, so a 2rem glyph plus affix padding cannot fit).
		 */
		iconSize?: string;
	}

	const {
		icon,
		label,
		visuallyHiddenLabel = false,
		swapIcon = undefined,
		swapped = false,
		iconSize = '20px',
		size = 'lg',
		emphasis = 'primary',
		...props
	}: Props = $props();

	// Cross-fade per state-change icon convention: scale 0.25 ↔ 1, opacity,
	// blur(4px) ↔ 0 — exact properties listed, never `transition: all`.
	const swapTransition = css.raw({
		transition:
			'opacity 300ms cubic-bezier(0.2, 0, 0, 1), transform 300ms cubic-bezier(0.2, 0, 0, 1), filter 300ms cubic-bezier(0.2, 0, 0, 1)',
		_motionReduce: { transition: 'none' }
	});

	const baseIconClass = css(swapTransition, {
		'[data-swapped="true"] &': {
			opacity: 0,
			transform: 'scale(0.25)',
			filter: 'blur(4px)'
		}
	});

	const swapIconClass = css(swapTransition, {
		opacity: 0,
		transform: 'scale(0.25)',
		filter: 'blur(4px)',
		'[data-swapped="true"] &': {
			opacity: 1,
			transform: 'scale(1)',
			filter: 'blur(0px)'
		}
	});
</script>

{#snippet glyph()}
	{#if swapIcon}
		<span class={css({ position: 'relative', display: 'inline-flex' })} data-swapped={swapped}>
			<Icon
				{icon}
				width={iconSize}
				height={iconSize}
				class={baseIconClass}
				data-testid="icon-button-icon"
			/>
			<span
				class={css({
					position: 'absolute',
					inset: 0,
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center'
				})}
			>
				<Icon
					icon={swapIcon}
					width={iconSize}
					height={iconSize}
					class={swapIconClass}
					data-testid="icon-button-swap-icon"
				/>
			</span>
		</span>
	{:else}
		<Icon {icon} width={iconSize} height={iconSize} data-testid="icon-button-icon" />
	{/if}
{/snippet}

{#if visuallyHiddenLabel}
	<Button {size} {emphasis} {...props}>
		<Stamp emphasis="ghost" border="none" background="transparent">
			{@render glyph()}
		</Stamp>
		<span class={visuallyHidden()}>{label}</span>
	</Button>
{:else}
	<Button {size} {emphasis} {...props}>
		{label}
		{#snippet trailing()}
			<Stamp emphasis="ghost" border="none" background="transparent">
				{@render glyph()}
			</Stamp>
		{/snippet}
	</Button>
{/if}
