<script lang="ts">
	import Icon from '@iconify/svelte';
	import Banner, { type BannerProps } from '@pindoba/svelte-banner';
	import Button from '@pindoba/svelte-button';
	import Stamp from '@pindoba/svelte-stamp';
	import FeatureFlagToggle from './feature-flag-toggle.svelte';
	import {
		FEATURE_FLAGS,
		isFeatureEnabled,
		resetFeatureFlags,
		setFeatureFlag
	} from '$lib/feature-flags.svelte';
	import { css } from '@pindoba/styled-system/css';
</script>

<div
	class={css({ display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0', gap: 'md' })}
	data-testid="feature-flags-section"
>
	{#snippet flagIcon()}
		<Stamp shape="square" size="lg" emphasis="secondary" feedback="neutral" shadow="sm">
			<Icon icon="lucide:flag" width="22px" height="22px" />
		</Stamp>
	{/snippet}

	{#snippet resetButton()}
		<Button
			emphasis="ghost"
			size="sm"
			onclick={resetFeatureFlags}
			data-testid="feature-flags-reset"
		>
			Reset to defaults
		</Button>
	{/snippet}

	<!-- Header -->
	<Banner
		leading={flagIcon as BannerProps['leading']}
		heading="Feature flags"
		subheading="Turn in-development features on or off. Changes are saved on this device."
		trailing={FEATURE_FLAGS.length > 0 ? (resetButton as BannerProps['trailing']) : undefined}
	/>

	<!-- Content fills the remaining space -->
	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			flex: '1',
			minHeight: '0',
			borderRadius: 'xl',
			borderWidth: '1px',
			borderStyle: 'solid',
			borderColor: 'neutral.border.muted',
			background: 'neutral.surface.deep',
			overflow: 'hidden'
		})}
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
			<div
				class={css({
					display: 'flex',
					flexDirection: 'column',
					flex: '1',
					minHeight: '0',
					overflowY: 'auto',
					padding: 'md',
					gap: 'sm'
				})}
			>
				{#each FEATURE_FLAGS as flag (flag.key)}
					<FeatureFlagToggle
						{flag}
						enabled={isFeatureEnabled(flag.key)}
						onToggle={(value) => setFeatureFlag(flag.key, value)}
					/>
				{/each}
			</div>
		{/if}
	</div>
</div>
