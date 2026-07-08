<script lang="ts">
	import Icon from '@iconify/svelte';
	import Banner, { type BannerProps } from '@pindoba/svelte-banner';
	import Button from '@pindoba/svelte-button';
	import Card, { type PrimitiveCardHeaderProps } from '@pindoba/svelte-card';
	import Group from '@pindoba/svelte-group';
	import Input from '@pindoba/svelte-input';
	import Stamp from '@pindoba/svelte-stamp';
	import {
		getCleanupConfig,
		resetCleanupConfig,
		setCleanupConfig
	} from '$domains/repository-cleanup/core/composables/use-cleanup-config.svelte';
	import { css } from '@pindoba/styled-system/css';

	const config = $derived(getCleanupConfig());

	function updateThreshold(value: string) {
		const parsed = Number.parseInt(value, 10);
		if (Number.isFinite(parsed) && parsed >= 1) {
			setCleanupConfig({ thresholdDays: parsed });
		}
	}
</script>

<div
	class={css({ display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0', gap: 'md' })}
	data-testid="cleanup-settings-section"
>
	{#snippet cleanupIcon()}
		<Stamp shape="square" size="lg" emphasis="secondary" feedback="neutral" shadow="sm">
			<Icon icon="lucide:brush-cleaning" width="22px" height="22px" />
		</Stamp>
	{/snippet}
	{#snippet resetButton()}
		<Button emphasis="ghost" size="sm" onclick={resetCleanupConfig} data-testid="cleanup-reset">
			Reset to defaults
		</Button>
	{/snippet}

	<Banner
		leading={cleanupIcon as BannerProps['leading']}
		heading="Cleanup"
		subheading="Configure how repositories are cleaned. Changes are saved on this device."
		trailing={resetButton as BannerProps['trailing']}
	/>

	<!-- Recessed well so the raised setting cards read with depth. -->
	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			flex: '1',
			minHeight: '0',
			overflowY: 'auto',
			gap: 'sm',
			borderRadius: 'xl',
			borderWidth: '1px',
			borderStyle: 'solid',
			borderColor: 'neutral.border.muted',
			background: 'neutral.surface.deep',
			padding: 'md'
		})}
	>
		<!-- Staleness threshold -->
		{#snippet thresholdControl()}
			<div class={css({ width: '120px' })}>
				<Input
					type="number"
					size="md"
					value={String(config.thresholdDays)}
					aria-label="Staleness threshold in days"
					data-testid="cleanup-threshold"
					onchange={(event: Event) =>
						updateThreshold((event.currentTarget as HTMLInputElement).value)}
				/>
			</div>
		{/snippet}
		<Card
			size="sm"
			background="surface.step.2"
			border="default"
			header={{
				layout: { root: { align: 'center' } },
				heading: 'Staleness threshold (days)',
				subheading:
					'A repository is “stale” when its most recent commit and file change are both older than this.',
				trailing: thresholdControl as PrimitiveCardHeaderProps['trailing']
			}}
		/>

		<!-- Default deletion mode -->
		{#snippet deletionControl()}
			<Group orientation="horizontal">
				<Button
					size="sm"
					emphasis={config.defaultDeletionMode === 'trash' ? 'primary' : 'secondary'}
					onclick={() => setCleanupConfig({ defaultDeletionMode: 'trash' })}
					data-testid="cleanup-default-trash"
				>
					Move to Trash
				</Button>
				<Button
					size="sm"
					emphasis={config.defaultDeletionMode === 'permanent' ? 'primary' : 'secondary'}
					onclick={() => setCleanupConfig({ defaultDeletionMode: 'permanent' })}
					data-testid="cleanup-default-permanent"
				>
					Delete permanently
				</Button>
			</Group>
		{/snippet}
		<Card
			size="sm"
			background="surface.step.2"
			border="default"
			header={{
				layout: { root: { align: 'center' } },
				heading: 'Default deletion method',
				trailing: deletionControl as PrimitiveCardHeaderProps['trailing']
			}}
		/>

		<!-- How folders are discovered (informational) -->
		{#snippet whatGetsCleaned()}
			<span>
				Cleanable folders are discovered from each repository's <code>.gitignore</code>, plus a
				built-in safety list of well-known regenerable folders (node_modules, target, dist, …). You
				choose which paths to keep on the cleanup page.
			</span>
		{/snippet}
		<Card
			size="sm"
			background="surface.step.2"
			border="default"
			header={{
				heading: 'What gets cleaned',
				subheading: whatGetsCleaned as PrimitiveCardHeaderProps['subheading']
			}}
		/>
	</div>
</div>
