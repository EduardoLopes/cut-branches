<script lang="ts">
	import type { ButtonProps } from '@pindoba/svelte-button';
	import { sidebarCollapsed } from '$lib/sidebar-collapsed.svelte';
	import IconButton from '$ui/core/icon-button.svelte';

	interface Props {
		/**
		 * Control size. Defaults to `sm` for the sidebar's own row; the macOS
		 * titlebar passes `xs`, which fits inside the 2.8rem titlebar band with
		 * room to breathe instead of filling it edge to edge.
		 */
		size?: ButtonProps['size'];
	}

	const { size = 'sm' }: Props = $props();

	// A 2rem `xs` control can't hold IconButton's 20px default glyph — it would
	// push the button past 2rem and, in the titlebar, off the traffic lights'
	// axis. 14px leaves the affix its padding, and reads level with the 12px
	// lights next to it.
	const iconSize = $derived(size === 'xs' ? '14px' : '20px');

	// One control, two homes: the window's overlay titlebar on macOS, the
	// sidebar's own bottom row everywhere else. Both read the same shared flag,
	// so neither placement owns the state.
	const collapsed = $derived(sidebarCollapsed.current);
</script>

<IconButton
	{size}
	{iconSize}
	shape="square"
	emphasis="ghost"
	icon="lucide:panel-left-close"
	swapIcon="lucide:panel-left-open"
	swapped={collapsed}
	label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
	visuallyHiddenLabel
	aria-expanded={!collapsed}
	onclick={() => sidebarCollapsed.toggle()}
/>
