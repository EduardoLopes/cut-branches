<script lang="ts">
	import Icon from '@iconify/svelte';
	import Banner, { type BannerProps } from '@pindoba/svelte-banner';
	import Button from '@pindoba/svelte-button';
	import Stamp from '@pindoba/svelte-stamp';
	import { useAbout } from '../core/composables/use-about.svelte';
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

<div
	class={css({ display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0', gap: 'md' })}
	data-testid="about-section"
>
	{#snippet logo()}
		<Stamp shape="circle" size="lg" emphasis="primary" feedback="primary" shadow="sm">
			<Icon icon="game-icons:tree-branch" width="22px" height="22px" />
		</Stamp>
	{/snippet}

	<!-- Header -->
	<Banner
		leading={logo as BannerProps['leading']}
		heading="Cut Branches"
		subheading={`Version ${about.appVersion}`}
	/>

	<!-- Content fills the remaining space -->
	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			flex: '1',
			minHeight: '0',
			gap: 'lg',
			borderRadius: 'xl',
			borderWidth: '1px',
			borderStyle: 'solid',
			borderColor: 'neutral.border.muted',
			background: 'neutral.surface.step.2',
			overflowY: 'auto',
			padding: 'lg'
		})}
	>
		<p class={css({ fontSize: 'sm', lineHeight: '1.7', margin: '0', color: 'neutral.text.muted' })}>
			Manage and clean up your Git branches effortlessly — review, delete in bulk, and restore
			anything you remove by mistake.
		</p>

		<!-- Version / environment info -->
		<dl
			class={css({
				display: 'flex',
				flexDirection: 'column',
				gap: '0',
				margin: '0',
				borderRadius: 'lg',
				borderWidth: '1px',
				borderStyle: 'solid',
				borderColor: 'neutral.border.muted',
				background: 'neutral.surface.step.1',
				overflow: 'hidden',
				'& > div + div': {
					borderTopWidth: '1px',
					borderTopStyle: 'solid',
					borderTopColor: 'neutral.border.muted'
				}
			})}
			data-testid="about-info"
		>
			{#each infoRows as row (row.label)}
				<div
					class={css({
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: 'md',
						paddingBlock: 'sm',
						paddingInline: 'md'
					})}
				>
					<dt class={css({ fontSize: 'sm', color: 'neutral.text.muted' })}>{row.label}</dt>
					<dd
						class={css({
							margin: '0',
							fontSize: 'sm',
							fontFamily: 'mono',
							color: 'neutral.text'
						})}
					>
						{row.value}
					</dd>
				</div>
			{/each}
		</dl>

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
			<Button
				emphasis="ghost"
				size="sm"
				onclick={about.openLogsFolder}
				data-testid="about-open-logs"
			>
				{#snippet leading()}
					<Stamp emphasis="ghost" border="none" background="transparent">
						<Icon icon="lucide:folder-open" width="16px" height="16px" />
					</Stamp>
				{/snippet}
				Open logs folder
			</Button>
		</div>
	</div>
</div>
