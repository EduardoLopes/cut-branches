<script lang="ts">
	import LucideFlag from '@lucide/svelte/icons/flag';
	import Banner, { type BannerProps } from '@pindoba/svelte-banner';
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import List, { type ListRowApi } from '@pindoba/svelte-list';
	import Stamp from '@pindoba/svelte-stamp';
	import {
		type FeatureFlagDefinition,
		getVisibleFeatureFlags,
		isFeatureEnabled,
		resetFeatureFlags,
		setFeatureFlag
	} from '$lib/feature-flags.svelte';
	import EmptyState from '$ui/core/empty-state.svelte';
	import Icon from '$ui/core/icon.svelte';
	import SettingsGroup from '$ui/patterns/settings-group.svelte';
	import SettingsSection from '$ui/patterns/settings-section.svelte';
	import { css } from '@pindoba/styled-system/css';

	// Flags marked `hidden` stay out of Settings entirely — they are pinned to
	// their registry default and must not be user-toggleable.
	const flags = getVisibleFeatureFlags();

	// One custom row per flag: the List keeps the card, row padding and
	// hairlines, while the `row` snippet lays the flag out as its own Banner
	// (see below). The flag rides along in `data`.
	const rows = $derived(
		flags.map((flag) => ({
			id: flag.key,
			custom: true,
			data: flag,
			'data-testid': 'feature-flag-toggle'
		}))
	);
</script>

{#snippet flagIcon()}
	<Stamp shape="square" size="sm" emphasis="secondary" tone="neutral" border="none" shadow="sm">
		<Icon icon={LucideFlag} width="16px" height="16px" />
	</Stamp>
{/snippet}

<!--
	A flag row is a Banner whose icon belongs to the title line only (the
	heading's own `leading`), so the description sits flush left underneath
	instead of indented past an icon column. The switch is the row's main
	control: the Banner's top-level `trailing`, a column of its own centred on
	the whole row, so the text wraps before it rather than running under it.
	Every row carries its flag in `data`, so it is always set.
-->
{#snippet flagRow(row: ListRowApi<FeatureFlagDefinition>)}
	{@const flag = row.data!}
	{@const enabled = isFeatureEnabled(flag.key)}
	{#snippet rowIcon()}
		<!-- The outline is the on-state cue: a bare stamp while the flag is off. -->
		<Stamp
			shape="square"
			size="md"
			emphasis="secondary"
			tone="neutral"
			border={enabled ? undefined : 'none'}
			shadow="sm"
			data-enabled={enabled}
			data-testid={`feature-flag-icon-${flag.key}`}
		>
			<Icon icon={flag.icon!} width="18px" height="18px" />
		</Stamp>
	{/snippet}
	<Banner
		headingLevel={3}
		size="sm"
		heading={{ leading: flag.icon ? rowIcon : undefined, content: flag.label }}
		subheading={flag.description}
		layout={{ trailing: { align: 'center' } }}
		passThrough={{
			// The heading's leading slot sizes its addon from the title's line
			// (`--affix-box`, ~18px here); widen it so the stamp reads at `md`.
			headingLeading: { style: css.raw({ '--affix-box': '24px' }) },
			trailing: { style: css.raw({ paddingInlineStart: 'xl' }) }
		}}
	>
		{#snippet trailing()}
			<Checkbox
				appearance="switch"
				checked={enabled}
				onchange={() => setFeatureFlag(flag.key, !enabled)}
				aria-label={flag.label}
				data-testid={`feature-flag-checkbox-${flag.key}`}
			/>
		{/snippet}
	</Banner>
{/snippet}

{#snippet resetButton()}
	<Button emphasis="ghost" size="sm" onclick={resetFeatureFlags} data-testid="feature-flags-reset">
		Reset to defaults
	</Button>
{/snippet}

<SettingsSection
	heading="Feature flags"
	subheading="Turn in-development features on or off. Changes are saved on this device."
	leading={flagIcon as BannerProps['leading']}
	trailing={flags.length > 0 ? (resetButton as BannerProps['trailing']) : undefined}
	testId="feature-flags-section"
>
	<SettingsGroup
		heading="Experiments"
		description="Flags gate features that are still being built. Turning one on surfaces it in the app right away; turning it off hides it again without losing any data."
	>
		{#if flags.length === 0}
			<!-- The registry is a compile-time source constant, so an empty list is only
			     ever a developer/build state — never something a user's actions produce.
			     The instruction to edit source is therefore dev-only. -->
			<EmptyState
				icon={LucideFlag}
				size="sm"
				heading="No feature flags yet"
				message={import.meta.env.DEV
					? 'Add one to the registry in `src/lib/feature-flags.svelte.ts` to gate an in-development feature and toggle it here.'
					: undefined}
				testId="feature-flags-empty"
			/>
		{:else}
			<List card={{}} size="lg" aria-label="Feature flags" items={rows} row={flagRow} />
		{/if}
	</SettingsGroup>
</SettingsSection>
