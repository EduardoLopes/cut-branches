<script lang="ts">
	import LucideFlag from '@lucide/svelte/icons/flag';
	import { type BannerProps } from '@pindoba/svelte-banner';
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import List, { type ListRowContext } from '@pindoba/svelte-list';
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
	import SettingsSection from '$ui/patterns/settings-section.svelte';

	// Flags marked `hidden` stay out of Settings entirely — they are pinned to
	// their registry default and must not be user-toggleable.
	const flags = getVisibleFeatureFlags();

	// One row per flag; the leading/trailing render slots read the flag back
	// from `data`, so every row gets its icon and switch from one snippet each.
	const rows = $derived(
		flags.map((flag) => ({
			id: flag.key,
			title: flag.label,
			description: flag.description,
			data: flag,
			'data-testid': 'feature-flag-toggle'
		}))
	);
</script>

{#snippet flagIcon()}
	<Stamp shape="square" size="sm" emphasis="secondary" tone="neutral" shadow="sm">
		<Icon icon={LucideFlag} width="16px" height="16px" />
	</Stamp>
{/snippet}

<!-- Every row carries its flag in `data`, so the context's optional `data` is
     always set here. -->
{#snippet rowIcon({ data }: ListRowContext<FeatureFlagDefinition>)}
	{@const flag = data!}
	{#if flag.icon}
		{@const enabled = isFeatureEnabled(flag.key)}
		<Stamp
			shape="square"
			size="md"
			emphasis={enabled ? 'secondary' : 'ghost'}
			tone={enabled ? 'primary' : 'neutral'}
			data-testid={`feature-flag-icon-${flag.key}`}
		>
			<Icon icon={flag.icon} width="18px" height="18px" />
		</Stamp>
	{/if}
{/snippet}

{#snippet rowToggle({ data }: ListRowContext<FeatureFlagDefinition>)}
	{@const flag = data!}
	{@const enabled = isFeatureEnabled(flag.key)}
	<Checkbox
		checked={enabled}
		onchange={() => setFeatureFlag(flag.key, !enabled)}
		aria-label={flag.label}
		data-testid={`feature-flag-checkbox-${flag.key}`}
	/>
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
		<List
			card={{ radius: 'inner' }}
			aria-label="Feature flags"
			items={rows}
			leading={rowIcon}
			trailing={rowToggle}
		/>
	{/if}
</SettingsSection>
