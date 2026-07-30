<script lang="ts">
	import Icon from '@iconify/svelte';
	import Banner, { type BannerProps } from '@pindoba/svelte-banner';
	import Input from '@pindoba/svelte-input';
	import Navigation, { type NavigationItem } from '@pindoba/svelte-navigation';
	import Stamp from '@pindoba/svelte-stamp';
	import { type Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { isFeatureEnabled, isFeatureFlagsSectionVisible } from '$lib/feature-flags.svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	type SectionId = 'feature-flags' | 'cleanup' | 'about';

	// The cleanup section only appears when its feature flag is enabled.
	const sections = $derived<{ id: SectionId; label: string; icon: string; href: string }[]>([
		// Feature flags are surfaced when the registry has entries, or in dev builds
		// so the empty-registry guidance stays reachable (see feature-flags.svelte).
		...(isFeatureFlagsSectionVisible()
			? [
					{
						id: 'feature-flags' as const,
						label: 'Feature flags',
						icon: 'lucide:flag',
						href: resolve('/settings/feature-flags')
					}
				]
			: []),
		...(isFeatureEnabled('repository-cleanup')
			? [
					{
						id: 'cleanup' as const,
						label: 'Cleanup',
						icon: 'lucide:brush-cleaning',
						href: resolve('/settings/cleanup')
					}
				]
			: []),
		{ id: 'about', label: 'About', icon: 'lucide:info', href: resolve('/settings/about') }
	]);

	let searchQuery = $state('');

	const query = $derived(searchQuery.trim().toLowerCase());
	const filteredSections = $derived(
		query ? sections.filter((section) => section.label.toLowerCase().includes(query)) : sections
	);

	// The active section is driven by the URL, not local state — each section is
	// its own route, so the nav simply reflects where we are.
	const matchedSection = $derived(
		sections.find((section) => page.url.pathname.startsWith(section.href))
	);
	// `sections` always contains at least About, so the first entry is safe.
	const activeSection = $derived(matchedSection ? matchedSection.id : sections[0].id);

	function iconFor(id: SectionId): NavigationItem['leading'] {
		if (id === 'feature-flags') return flagIcon as NavigationItem['leading'];
		if (id === 'cleanup') return cleanupIcon as NavigationItem['leading'];
		return infoIcon as NavigationItem['leading'];
	}

	const menuItems = $derived<NavigationItem[]>(
		filteredSections.map((section) => ({
			id: section.id,
			label: section.label,
			href: section.href,
			leading: iconFor(section.id)
		}))
	);
</script>

{#snippet settingsIcon()}
	<Stamp shape="square" size="md" emphasis="ghost" feedback="neutral" border="none">
		<Icon icon="lucide:settings" width="18px" height="18px" />
	</Stamp>
{/snippet}
{#snippet flagIcon()}
	<Stamp size="sm" shape="square" emphasis="ghost" background="transparent" border="none">
		<Icon icon="lucide:flag" />
	</Stamp>
{/snippet}
{#snippet cleanupIcon()}
	<Stamp size="sm" shape="square" emphasis="ghost" background="transparent" border="none">
		<Icon icon="lucide:brush-cleaning" />
	</Stamp>
{/snippet}
{#snippet infoIcon()}
	<Stamp size="sm" shape="square" emphasis="ghost" background="transparent" border="none">
		<Icon icon="lucide:info" />
	</Stamp>
{/snippet}

<div class={css({ overflow: 'hidden', position: 'relative', height: 'calc(100vh - 30px)' })}>
	<main
		class={css({
			display: 'flex',
			height: '100%',
			overflow: 'hidden',
			background: 'neutral.surface.deep'
		})}
		data-testid="settings-view"
	>
		<!-- Navigation bar: title + search + section menu -->
		<nav
			class={css({
				display: 'flex',
				flexDirection: 'column',
				flexShrink: '0',
				width: '260px',
				overflow: 'hidden',
				gap: 'md',
				p: 'md',
				background: 'neutral.surface.step.2',
				borderRightWidth: '1px',
				borderRightStyle: 'solid',
				borderRightColor: 'neutral.border.muted'
			})}
		>
			<Banner heading="Settings" leading={settingsIcon as BannerProps['leading']} />

			<!-- Search sits directly above the menu (grouped, no gap between them) -->
			<div
				class={css({
					display: 'flex',
					flexDirection: 'column',
					gap: 'xs',
					flex: '1',
					minHeight: '0'
				})}
			>
				<Input
					type="search"
					size="md"
					placeholder="Search settings"
					aria-label="Search settings"
					bind:value={searchQuery}
					data-testid="settings-search"
				>
					{#snippet leading()}
						<Stamp emphasis="ghost" border="none" background="transparent">
							<Icon icon="lucide:search" width="16px" height="16px" />
						</Stamp>
					{/snippet}
				</Input>

				<div
					class={css({
						flex: '1',
						minHeight: '0',
						overflowY: 'auto',
						paddingInline: 'xs',
						marginInline: 'calc(token(spacing.xs) * -1)'
					})}
				>
					{#if menuItems.length > 0}
						<Navigation
							items={menuItems}
							activeItem={activeSection}
							direction="vertical"
							emphasis="tertiary"
							background="transparent"
						/>
					{:else}
						<p
							class={css({ px: 'sm', py: 'md', fontSize: 'sm', color: 'neutral.text.muted' })}
							data-testid="settings-search-empty"
						>
							No settings match your search.
						</p>
					{/if}
				</div>
			</div>
		</nav>

		<!-- Content: the active section route renders here -->
		<div
			class={css({
				display: 'flex',
				flexDirection: 'column',
				flex: '1',
				minWidth: '0',
				overflow: 'hidden',
				padding: 'lg',
				background: 'neutral.surface.soft'
			})}
		>
			{@render children?.()}
		</div>
	</main>
</div>
