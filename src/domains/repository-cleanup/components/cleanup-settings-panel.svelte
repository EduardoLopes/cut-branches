<script lang="ts">
	import LucideBrushCleaning from '@lucide/svelte/icons/brush-cleaning';
	import { type BannerProps } from '@pindoba/svelte-banner';
	import Button from '@pindoba/svelte-button';
	import Choice, { ChoiceItem } from '@pindoba/svelte-choice';
	import Input from '@pindoba/svelte-input';
	import List from '@pindoba/svelte-list';
	import Stamp from '@pindoba/svelte-stamp';
	import {
		getCleanupConfig,
		resetCleanupConfig,
		setCleanupConfig
	} from '$domains/repository-cleanup/core/composables/use-cleanup-config.svelte';
	import Icon from '$ui/core/icon.svelte';
	import SettingsGroup from '$ui/patterns/settings-group.svelte';
	import SettingsSection from '$ui/patterns/settings-section.svelte';
	import { css } from '@pindoba/styled-system/css';

	const config = $derived(getCleanupConfig());

	function updateThreshold(value: string) {
		const parsed = Number.parseInt(value, 10);
		if (Number.isFinite(parsed) && parsed >= 1) {
			setCleanupConfig({ thresholdDays: parsed });
		}
	}

	function updateDeletionMode(value: string | undefined) {
		if (value === 'trash' || value === 'permanent') {
			setCleanupConfig({ defaultDeletionMode: value });
		}
	}
</script>

{#snippet cleanupIcon()}
	<Stamp shape="square" size="sm" emphasis="secondary" tone="neutral" border="none" shadow="sm">
		<Icon icon={LucideBrushCleaning} width="16px" height="16px" />
	</Stamp>
{/snippet}

{#snippet resetButton()}
	<Button emphasis="ghost" size="sm" onclick={resetCleanupConfig} data-testid="cleanup-reset">
		Reset to defaults
	</Button>
{/snippet}

{#snippet detectionDescription()}
	Cleanable folders come from each repository's <code>.gitignore</code> (nested ones included). Only
	directories your repository ignores are ever proposed — a repository without a
	<code>.gitignore</code> has nothing to clean.
{/snippet}

{#snippet thresholdControl()}
	<div class={css({ width: '120px' })}>
		<Input
			type="number"
			size="md"
			value={String(config.thresholdDays)}
			aria-label="Staleness threshold in days"
			data-testid="cleanup-threshold"
			onchange={(event: Event) => updateThreshold((event.currentTarget as HTMLInputElement).value)}
		/>
	</div>
{/snippet}

{#snippet deletionControl()}
	<Choice
		type="radio"
		appearance="button"
		size="sm"
		value={[config.defaultDeletionMode]}
		onValueChange={(value) => updateDeletionMode(value[0])}
		aria-label="Default deletion method"
	>
		<ChoiceItem value="trash" label="Move to Trash" data-testid="cleanup-default-trash" />
		<ChoiceItem
			value="permanent"
			label="Delete permanently"
			data-testid="cleanup-default-permanent"
		/>
	</Choice>
{/snippet}

<SettingsSection
	heading="Cleanup"
	subheading="Configure how repositories are cleaned. Changes are saved on this device."
	leading={cleanupIcon as BannerProps['leading']}
	trailing={resetButton as BannerProps['trailing']}
	testId="cleanup-settings-section"
>
	<SettingsGroup
		heading="Detection"
		description={detectionDescription as BannerProps['subheading']}
	>
		<List
			density="comfortable"
			card={{}}
			aria-label="Detection settings"
			items={[
				{
					id: 'threshold',
					title: 'Staleness threshold (days)',
					description:
						'A repository is “stale” when its most recent commit and file change are both older than this.',
					trailing: thresholdControl
				}
			]}
		/>
	</SettingsGroup>

	<SettingsGroup
		heading="Deletion"
		description="What happens to selected folders when you clean. The Trash keeps them recoverable; permanent deletion frees the space immediately."
	>
		<List
			density="comfortable"
			card={{}}
			aria-label="Deletion settings"
			items={[{ id: 'deletion', title: 'Default deletion method', trailing: deletionControl }]}
		/>
	</SettingsGroup>
</SettingsSection>
