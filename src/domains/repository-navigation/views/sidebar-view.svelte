<script lang="ts">
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Navigation, { type NavigationItem } from '@pindoba/svelte-navigation';
	import Stamp from '@pindoba/svelte-stamp';
	import { type Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import RepositoryNavList from '$domains/repository-navigation/components/repository-nav-list.svelte';
	import SidebarBrand from '$domains/repository-navigation/components/sidebar-brand.svelte';
	import { cleanupSummary } from '$lib/cleanup-summary.svelte';
	import { isFeatureEnabled } from '$lib/feature-flags.svelte';
	import IconButton from '$ui/core/icon-button.svelte';
	import { formatBytes } from '$utils/format-bytes';
	import { getLocalStorage } from '$utils/get-local-storage';
	import { setLocalStorage } from '$utils/set-local-storage';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		repositoryListAction?: Snippet<[]>;
		/** Opens the Pindoba design-token editor mounted in the app shell. */
		onOpenDevtools?: () => void;
	}

	const { repositoryListAction, onOpenDevtools }: Props = $props();

	const STORAGE_KEY = 'sidebar-collapsed';

	// Collapsed rail is delivery-layer UI state, persisted across sessions.
	let collapsed = $state<boolean>(getLocalStorage<boolean>(STORAGE_KEY, false) === true);

	function toggleSidebar() {
		collapsed = !collapsed;
		setLocalStorage(STORAGE_KEY, collapsed);
	}

	// Highlight the active app-nav entry based on the current route.
	const appActiveItem = $derived(
		page.url?.pathname?.startsWith('/settings')
			? 'settings'
			: page.url?.pathname?.startsWith('/cleanup')
				? 'cleanup'
				: undefined
	);

	// App-level navigation (settings and future global entries), reusing the same
	// Navigation component as the repository list so it gets collapse + tooltips.
	// The cleanup entry is feature-flag gated.
	// Reclaimable space from the latest background scan; drives the badge.
	const reclaimableBytes = $derived(cleanupSummary.reclaimableBytes ?? 0);

	const appNavItems = $derived<NavigationItem[]>([
		...(isFeatureEnabled('repository-cleanup')
			? [
					{
						id: 'cleanup',
						label: 'Clean up',
						href: resolve('/cleanup'),
						leading: cleanupIcon as NavigationItem['leading'],
						// Expanded only: "20.1 GB" is wider than the rail square itself,
						// so collapsed it would overflow the item. The number is one
						// expand away; the rail keeps just the icon.
						trailing:
							reclaimableBytes > 0 && !collapsed
								? (cleanupBadge as NavigationItem['trailing'])
								: undefined,
						'data-testid': 'sidebar-cleanup'
					}
				]
			: []),
		{
			id: 'settings',
			label: 'Settings',
			href: resolve('/settings'),
			leading: settingsIcon as NavigationItem['leading'],
			'data-testid': 'sidebar-settings'
		},
		...(onOpenDevtools
			? [
					{
						id: 'theme-editor',
						label: 'Theme editor',
						leading: themeEditorIcon as NavigationItem['leading'],
						onclick: () => onOpenDevtools(),
						'data-testid': 'sidebar-theme-editor'
					}
				]
			: [])
	]);
</script>

{#snippet settingsIcon()}
	<Stamp size="sm" shape="square" emphasis="ghost" background="transparent" border="none">
		<Icon icon="lucide:settings" />
	</Stamp>
{/snippet}
{#snippet themeEditorIcon()}
	<Stamp size="sm" shape="square" emphasis="ghost" background="transparent" border="none">
		<Icon icon="lucide:palette" />
	</Stamp>
{/snippet}
{#snippet cleanupIcon()}
	<Stamp size="sm" shape="square" emphasis="ghost" background="transparent" border="none">
		<Icon icon="lucide:brush-cleaning" />
	</Stamp>
{/snippet}
{#snippet cleanupBadge()}
	<Badge size="sm" emphasis="adaptive" data-testid="sidebar-cleanup-badge">
		{formatBytes(reclaimableBytes)}
	</Badge>
{/snippet}

<section
	class={css({
		display: 'flex',
		flexDirection: 'column',
		height: '100%',
		minHeight: 0,
		overflow: 'hidden',
		background: 'neutral.surface.soft',
		borderRightWidth: '1px',
		borderRightStyle: 'solid',
		borderRightColor: 'neutral.border.muted',
		// Explicit widths so the collapse animates: `max-content` (the grid
		// column) can't interpolate. Expanded fits the 260px-class list rows;
		// collapsed is exactly the rail items' square (5.2rem) plus their xs
		// inset on each side — the brand and footer center inside that.
		width: '27.2rem',
		'&[data-rail="true"]': { width: '6.8rem' },
		// Same family as Navigation's own 200ms item morph, run slightly longer
		// with a hard launch and a long settle so the rail "snaps" shut and
		// glides the last few px.
		transition: 'width 350ms cubic-bezier(0.32, 0.72, 0, 1)',
		_motionReduce: { transition: 'none' }
	})}
	data-rail={collapsed}
>
	<SidebarBrand {collapsed} />
	<RepositoryNavList headerAction={repositoryListAction} compact={collapsed ? 'stack' : 'none'} />

	<div
		class={css({
			marginTop: 'auto',
			display: 'flex',
			// Same xs inset in both states: it matches the repository list's rail
			// padding, so the footer squares sit on the same column as the list's.
			// Left-anchored in both states: the symmetric xs inset leaves exactly
			// one item square of content width in the rail, so flex-start IS
			// centered at the final width — centering instead would drag the items
			// rightward through the width animation.
			px: 'xs',
			justifyContent: 'flex-start',
			py: '2xs',
			background: 'neutral.surface.soft',
			borderTopWidth: '1px',
			borderTopStyle: 'solid',
			borderTopColor: 'neutral.border.muted'
		})}
		data-rail={collapsed}
	>
		<Navigation
			items={appNavItems}
			activeItem={appActiveItem}
			direction="vertical"
			emphasis="neutral"
			background="transparent"
			compact={collapsed ? 'stack' : 'none'}
			passThrough={{ root: { style: css.raw({ width: '100%' }) } }}
		/>
	</div>

	<!-- Bottom-most section, home of the collapse toggle alone. -->
	<div
		class={css({
			display: 'flex',
			justifyContent: 'flex-end',
			px: 'xs',
			py: '2xs',
			borderTopWidth: '1px',
			borderTopStyle: 'solid',
			borderTopColor: 'neutral.border.muted',
			// End-aligned in both states, so during collapse the toggle rides the
			// sidebar's shrinking right edge; the rail's inline padding then
			// animates it the last stretch to dead centre — (6.8 − 2.4) / 2 around
			// the 2.4rem button — on the same curve as the width.
			transition: 'padding 350ms cubic-bezier(0.32, 0.72, 0, 1)',
			_motionReduce: { transition: 'none' },
			'&[data-rail="true"]': { px: '2.2rem' }
		})}
		data-rail={collapsed}
	>
		<IconButton
			size="sm"
			shape="square"
			emphasis="ghost"
			icon="lucide:panel-left-close"
			swapIcon="lucide:panel-left-open"
			swapped={collapsed}
			label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
			visuallyHiddenLabel
			aria-expanded={!collapsed}
			onclick={toggleSidebar}
		/>
	</div>
</section>
