<script lang="ts">
	import Icon from '@iconify/svelte';
	import { type BannerProps } from '@pindoba/svelte-banner';
	import Button from '@pindoba/svelte-button';
	import Stamp from '@pindoba/svelte-stamp';
	import { useAbout } from '../core/composables/use-about.svelte';
	import SettingsField from '$ui/patterns/settings-field.svelte';
	import SettingsSection from '$ui/patterns/settings-section.svelte';
	import { css } from '@pindoba/styled-system/css';

	const about = useAbout();

	const infoRows = $derived([
		{ label: 'App version', value: about.appVersion },
		{ label: 'Build', value: about.build },
		{ label: 'Operating system', value: about.osSummary },
		{ label: 'Tauri', value: about.tauriVersion },
		{ label: 'Locale', value: about.locale },
		{ label: 'Identifier', value: about.appIdentifier }
	]);
</script>

{#snippet logo()}
	<!-- Identity exception to the settings-section Stamp convention: the About
	     header brands the app, so it uses the primary circular stamp. -->
	<Stamp shape="circle" size="sm" emphasis="primary" feedback="primary" shadow="sm">
		<Icon icon="game-icons:tree-branch" width="16px" height="16px" />
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

	<!-- Version / environment info -->
	{#each infoRows as row (row.label)}
		<SettingsField heading={row.label} value={row.value} />
	{/each}

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
					<Icon icon="lucide:clipboard-copy" width="16px" height="16px" />
				</Stamp>
			{/snippet}
			Copy diagnostics
		</Button>
		<Button emphasis="ghost" size="sm" onclick={about.openLogsFolder} data-testid="about-open-logs">
			{#snippet leading()}
				<Stamp emphasis="ghost" border="none" background="transparent">
					<Icon icon="lucide:folder-open" width="16px" height="16px" />
				</Stamp>
			{/snippet}
			Open logs folder
		</Button>
	</div>
</SettingsSection>
