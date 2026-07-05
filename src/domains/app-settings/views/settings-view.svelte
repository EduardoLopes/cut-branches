<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Stamp from '@pindoba/svelte-stamp';
	import FeatureFlagToggle from '../components/feature-flag-toggle.svelte';
	import {
		FEATURE_FLAGS,
		isFeatureEnabled,
		resetFeatureFlags,
		setFeatureFlag
	} from '$lib/feature-flags.svelte';
	import IconButton from '$ui/core/icon-button.svelte';
	import { css } from '@pindoba/styled-system/css';

	function goBack() {
		history.back();
	}
</script>

<section
	class={css({
		display: 'flex',
		flexDirection: 'column',
		gap: 'xl',
		height: 'full',
		width: 'full',
		overflowY: 'auto',
		padding: '2xl',
		background: 'neutral.surface.step.1'
	})}
	data-testid="settings-view"
>
	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			gap: 'lg',
			width: 'full',
			maxWidth: '720px',
			marginX: 'auto'
		})}
	>
		<!-- Header -->
		<div class={css({ display: 'flex', alignItems: 'center', gap: 'md' })}>
			<IconButton
				size="md"
				shape="square"
				emphasis="ghost"
				icon="lucide:arrow-left"
				label="Back"
				visuallyHiddenLabel
				onclick={goBack}
				data-testid="settings-back"
			/>
			<h1
				class={css({
					fontSize: '3xl',
					fontWeight: 'bold',
					margin: '0',
					color: 'neutral.text.bold'
				})}
			>
				Settings
			</h1>
		</div>

		<!-- Feature flags section -->
		<div
			class={css({
				display: 'flex',
				flexDirection: 'column',
				gap: 'md',
				padding: 'xl',
				borderRadius: 'xl',
				borderWidth: '1px',
				borderStyle: 'solid',
				borderColor: 'neutral.border.muted',
				background: 'neutral.surface.soft'
			})}
			data-testid="feature-flags-section"
		>
			<div
				class={css({
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
					gap: 'md'
				})}
			>
				<div class={css({ display: 'flex', flexDirection: 'column', gap: '2xs' })}>
					<h2
						class={css({
							fontSize: 'xl',
							fontWeight: 'semibold',
							margin: '0',
							color: 'neutral.text.bold'
						})}
					>
						Feature flags
					</h2>
					<p class={css({ fontSize: 'sm', color: 'neutral.text.muted', margin: '0' })}>
						Turn in-development features on or off. Changes are saved on this device.
					</p>
				</div>

				{#if FEATURE_FLAGS.length > 0}
					<Button
						emphasis="ghost"
						size="sm"
						onclick={resetFeatureFlags}
						data-testid="feature-flags-reset"
					>
						Reset to defaults
					</Button>
				{/if}
			</div>

			{#if FEATURE_FLAGS.length === 0}
				<div
					class={css({
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 'sm',
						paddingY: '2xl',
						textAlign: 'center',
						color: 'neutral.text.muted'
					})}
					data-testid="feature-flags-empty"
				>
					<Stamp shape="circle" size="lg" emphasis="secondary" feedback="neutral">
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
						'& > [data-testid="feature-flag-toggle"] + [data-testid="feature-flag-toggle"]': {
							borderTopWidth: '1px',
							borderTopStyle: 'solid',
							borderTopColor: 'neutral.border.muted'
						}
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
</section>
