<script lang="ts">
	import Icon from '@iconify/svelte';
	import { type BannerProps } from '@pindoba/svelte-banner';
	import Button from '@pindoba/svelte-button';
	import Stamp from '@pindoba/svelte-stamp';
	import FeatureFlagToggle from './feature-flag-toggle.svelte';
	import {
		FEATURE_FLAGS,
		isFeatureEnabled,
		resetFeatureFlags,
		setFeatureFlag
	} from '$lib/feature-flags.svelte';
	import EmptyState from '$ui/core/empty-state.svelte';
	import SettingsSection from '$ui/patterns/settings-section.svelte';
</script>

{#snippet flagIcon()}
	<Stamp shape="square" size="sm" emphasis="secondary" feedback="neutral" shadow="sm">
		<Icon icon="lucide:flag" width="16px" height="16px" />
	</Stamp>
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
	trailing={FEATURE_FLAGS.length > 0 ? (resetButton as BannerProps['trailing']) : undefined}
	testId="feature-flags-section"
>
	{#if FEATURE_FLAGS.length === 0}
		<!-- The registry is a compile-time source constant, so an empty list is only
		     ever a developer/build state — never something a user's actions produce.
		     The instruction to edit source is therefore dev-only. -->
		<EmptyState
			icon="lucide:flag"
			size="sm"
			heading="No feature flags yet"
			message={import.meta.env.DEV
				? 'Add one to the registry in `src/lib/feature-flags.svelte.ts` to gate an in-development feature and toggle it here.'
				: undefined}
			testId="feature-flags-empty"
		/>
	{:else}
		{#each FEATURE_FLAGS as flag (flag.key)}
			<FeatureFlagToggle
				{flag}
				enabled={isFeatureEnabled(flag.key)}
				onToggle={(value) => setFeatureFlag(flag.key, value)}
			/>
		{/each}
	{/if}
</SettingsSection>
