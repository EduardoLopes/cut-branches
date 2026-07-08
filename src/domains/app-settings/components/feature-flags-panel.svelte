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
	import SettingsSection from '$ui/patterns/settings-section.svelte';
	import { css } from '@pindoba/styled-system/css';
</script>

{#snippet flagIcon()}
	<Stamp shape="square" size="lg" emphasis="secondary" feedback="neutral" shadow="sm">
		<Icon icon="lucide:flag" width="22px" height="22px" />
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
		<div
			class={css({
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 'sm',
				flex: '1',
				textAlign: 'center',
				color: 'neutral.text.muted',
				padding: 'lg'
			})}
			data-testid="feature-flags-empty"
		>
			<Stamp shape="circle" size="lg" emphasis="ghost" feedback="neutral">
				<Icon icon="lucide:flag" width="20px" height="20px" />
			</Stamp>
			<span class={css({ fontSize: 'sm', fontWeight: 'medium', color: 'neutral.text' })}>
				No feature flags yet
			</span>
			<span class={css({ fontSize: 'xs', maxWidth: '420px' })}>
				Add one to the registry in <code>src/lib/feature-flags.svelte.ts</code> to gate an in-development
				feature and toggle it here.
			</span>
		</div>
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
