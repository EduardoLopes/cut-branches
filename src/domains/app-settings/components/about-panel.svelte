<script lang="ts">
	import LucideClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
	import LucideFolderOpen from '@lucide/svelte/icons/folder-open';
	import { type BannerProps } from '@pindoba/svelte-banner';
	import Button from '@pindoba/svelte-button';
	import List from '@pindoba/svelte-list';
	import Stamp from '@pindoba/svelte-stamp';
	import { useAbout } from '../core/composables/use-about.svelte';
	import BrandMark from '$ui/core/brand-mark.svelte';
	import Icon from '$ui/core/icon.svelte';
	import SettingsSection from '$ui/patterns/settings-section.svelte';
	import { css } from '@pindoba/styled-system/css';

	const about = useAbout();

	const infoRows = $derived([
		{ id: 'version', term: 'App version', value: about.appVersion },
		{ id: 'build', term: 'Build', value: about.build },
		{ id: 'os', term: 'Operating system', value: about.osSummary },
		{ id: 'tauri', term: 'Tauri', value: about.tauriVersion },
		{ id: 'locale', term: 'Locale', value: about.locale },
		{ id: 'identifier', term: 'Identifier', value: about.appIdentifier }
	]);
</script>

{#snippet logo()}
	<!-- Identity exception to the settings-section Stamp convention: the About
	     header brands the app, so it uses the primary circular stamp. -->
	<Stamp shape="circle" size="sm" emphasis="primary" tone="primary" shadow="sm">
		<BrandMark width="16px" height="16px" />
	</Stamp>
{/snippet}

<SettingsSection
	heading="Cut Branches"
	subheading={`Version ${about.appVersion}`}
	leading={logo as BannerProps['leading']}
	testId="about-section"
>
	<p class={css({ fontSize: 'sm', lineHeight: '1.7', margin: '0', color: 'neutral.text.muted' })}>
		Manage and clean up your Git branches effortlessly — review, delete in bulk, and restore
		anything you remove by mistake.
	</p>

	<!-- Version / environment info: label/value pairs, so one pairs list rather
	     than a card per fact. Mono values, since most are identifiers. -->
	<List
		layout="pairs"
		valueFont="mono"
		card={{ radius: 'inner' }}
		aria-label="Environment"
		items={infoRows}
		data-testid="about-environment"
	/>

	<!-- External links -->
	<div class={css({ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 'xs' })}>
		{#each about.links as link (link.id)}
			<Button
				emphasis="ghost"
				size="sm"
				onclick={() => about.openLink(link.url)}
				data-testid={`about-link-${link.id}`}
			>
				{#snippet leading()}
					<Stamp emphasis="ghost" border="none" background="transparent">
						<Icon icon={link.icon} width="16px" height="16px" />
					</Stamp>
				{/snippet}
				{link.label}
			</Button>
		{/each}
	</div>

	<!-- Diagnostics actions -->
	<div
		class={css({
			display: 'flex',
			flexWrap: 'wrap',
			gap: 'xs',
			marginTop: 'auto',
			paddingTop: 'md',
			borderTopWidth: '1px',
			borderTopStyle: 'solid',
			borderTopColor: 'neutral.border.muted'
		})}
	>
		<Button
			emphasis="secondary"
			size="sm"
			onclick={about.copyDiagnostics}
			data-testid="about-copy-diagnostics"
		>
			{#snippet leading()}
				<Stamp emphasis="ghost" border="none" background="transparent">
					<Icon icon={LucideClipboardCopy} width="16px" height="16px" />
				</Stamp>
			{/snippet}
			Copy diagnostics
		</Button>
		<Button emphasis="ghost" size="sm" onclick={about.openLogsFolder} data-testid="about-open-logs">
			{#snippet leading()}
				<Stamp emphasis="ghost" border="none" background="transparent">
					<Icon icon={LucideFolderOpen} width="16px" height="16px" />
				</Stamp>
			{/snippet}
			Open logs folder
		</Button>
	</div>
</SettingsSection>
