<script lang="ts">
	import LucideClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
	import LucideExternalLink from '@lucide/svelte/icons/external-link';
	import LucideFolderOpen from '@lucide/svelte/icons/folder-open';
	import { type BannerProps } from '@pindoba/svelte-banner';
	import Button from '@pindoba/svelte-button';
	import List, { type ListRowContext } from '@pindoba/svelte-list';
	import Stamp from '@pindoba/svelte-stamp';
	import { useAbout, type AboutLink } from '../core/composables/use-about.svelte';
	import BrandMark from '$ui/core/brand-mark.svelte';
	import Icon from '$ui/core/icon.svelte';
	import SettingsGroup from '$ui/patterns/settings-group.svelte';
	import SettingsSection from '$ui/patterns/settings-section.svelte';

	const about = useAbout();

	const infoRows = $derived([
		{ id: 'version', term: 'App version', value: about.appVersion },
		{ id: 'build', term: 'Build', value: about.build },
		{ id: 'os', term: 'Operating system', value: about.osSummary },
		{ id: 'tauri', term: 'Tauri', value: about.tauriVersion },
		{ id: 'locale', term: 'Locale', value: about.locale },
		{ id: 'identifier', term: 'Identifier', value: about.appIdentifier }
	]);

	// One row per external link; the leading/trailing render slots read the link
	// back from `data`, so every row gets its icon and button from one snippet each.
	const linkRows = $derived(
		about.links.map((link) => ({ id: link.id, title: link.label, data: link }))
	);

	const diagnosticsRows = [
		{
			id: 'copy',
			title: 'Copy diagnostics',
			description: 'Version, build and environment details, ready to paste into a bug report.',
			trailing: copyAction
		},
		{
			id: 'logs',
			title: 'Logs folder',
			description: "Where the app writes its logs. Attach them when something doesn't work.",
			trailing: logsAction
		}
	];
</script>

{#snippet logo()}
	<!-- Identity exception to the settings-section Stamp convention: the About
	     header brands the app, so it uses the primary circular stamp. -->
	<Stamp shape="circle" size="sm" emphasis="primary" tone="primary" shadow="sm">
		<BrandMark width="16px" height="16px" />
	</Stamp>
{/snippet}

<!-- Every link row carries its link in `data`, so the context's optional `data`
     is always set here. -->
{#snippet linkIcon({ data }: ListRowContext<AboutLink>)}
	<Stamp shape="square" size="md" emphasis="ghost" tone="neutral">
		<Icon icon={data!.icon} width="18px" height="18px" />
	</Stamp>
{/snippet}

{#snippet linkAction({ data }: ListRowContext<AboutLink>)}
	{@const link = data!}
	<Button
		emphasis="ghost"
		size="sm"
		onclick={() => about.openLink(link.url)}
		aria-label={`Open ${link.label}`}
		data-testid={`about-link-${link.id}`}
	>
		{#snippet trailing()}
			<Stamp emphasis="ghost" border="none" background="transparent">
				<Icon icon={LucideExternalLink} width="14px" height="14px" />
			</Stamp>
		{/snippet}
		Open
	</Button>
{/snippet}

{#snippet copyAction()}
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
		Copy
	</Button>
{/snippet}

{#snippet logsAction()}
	<Button
		emphasis="secondary"
		size="sm"
		onclick={about.openLogsFolder}
		data-testid="about-open-logs"
	>
		{#snippet leading()}
			<Stamp emphasis="ghost" border="none" background="transparent">
				<Icon icon={LucideFolderOpen} width="16px" height="16px" />
			</Stamp>
		{/snippet}
		Open
	</Button>
{/snippet}

<SettingsSection
	heading="Cut Branches"
	subheading={`Version ${about.appVersion}`}
	leading={logo as BannerProps['leading']}
	testId="about-section"
>
	<SettingsGroup
		heading="Application"
		description="Manage and clean up your Git branches effortlessly — review, delete in bulk, and restore anything you remove by mistake."
	>
		<!-- Version / environment info: label/value pairs, so one pairs list rather
		     than a card per fact. Mono values, since most are identifiers. -->
		<List
			layout="pairs"
			valueFont="mono"
			card={{}}
			aria-label="Environment"
			items={infoRows}
			data-testid="about-environment"
		/>
	</SettingsGroup>

	<SettingsGroup
		heading="Resources"
		description="Source code, release notes, and where to report a problem."
	>
		<List card={{}} aria-label="Links" items={linkRows} leading={linkIcon} trailing={linkAction} />
	</SettingsGroup>

	<SettingsGroup
		heading="Diagnostics"
		description="Details that help track down a bug. Nothing is sent anywhere — you decide what to share."
	>
		<List card={{}} aria-label="Diagnostics" items={diagnosticsRows} />
	</SettingsGroup>
</SettingsSection>
