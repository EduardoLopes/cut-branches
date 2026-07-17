<script lang="ts">
	import Icon from '@iconify/svelte';
	import { type BannerProps } from '@pindoba/svelte-banner';
	import Button from '@pindoba/svelte-button';
	import Group from '@pindoba/svelte-group';
	import Input from '@pindoba/svelte-input';
	import Stamp from '@pindoba/svelte-stamp';
	import type { Snippet } from 'svelte';
	import {
		getCleanupConfig,
		resetCleanupConfig,
		setCleanupConfig
	} from '$domains/repository-cleanup/core/composables/use-cleanup-config.svelte';
	import SettingsField from '$ui/patterns/settings-field.svelte';
	import SettingsSection from '$ui/patterns/settings-section.svelte';
	import { css } from '@pindoba/styled-system/css';

	const config = $derived(getCleanupConfig());

	function updateThreshold(value: string) {
		const parsed = Number.parseInt(value, 10);
		if (Number.isFinite(parsed) && parsed >= 1) {
			setCleanupConfig({ thresholdDays: parsed });
		}
	}
</script>

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

<SettingsSection
	heading="Cleanup"
	subheading="Configure how repositories are cleaned. Changes are saved on this device."
	leading={cleanupIcon as BannerProps['leading']}
	trailing={resetButton as BannerProps['trailing']}
	testId="cleanup-settings-section"
>
	<p
		class={css({
			fontSize: 'sm',
			lineHeight: '1.7',
			margin: '0',
			color: 'neutral.text.muted',
			textWrap: 'pretty'
		})}
	>
		Cleanable folders are discovered from each repository's <code>.gitignore</code> (including
		nested
		<code>.gitignore</code> files). Only directories your repository ignores are ever proposed or
		deleted — a repository with no <code>.gitignore</code> has nothing to clean. You choose which paths
		to keep on the cleanup page.
	</p>

	<SettingsField
		heading="Staleness threshold (days)"
		subheading="A repository is “stale” when its most recent commit and file change are both older than this."
		control={thresholdControl as Snippet}
	/>
	<SettingsField heading="Default deletion method" control={deletionControl as Snippet} />
</SettingsSection>
