<script lang="ts">
	import Icon from '@iconify/svelte';
	import Accordion, { AccordionItem } from '@pindoba/svelte-accordion';
	import Badge from '@pindoba/svelte-badge';
	import { type BannerProps } from '@pindoba/svelte-banner';
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Group from '@pindoba/svelte-group';
	import Input from '@pindoba/svelte-input';
	import Loading from '@pindoba/svelte-loading';
	import Panel from '@pindoba/svelte-panel';
	import Progress from '@pindoba/svelte-progress';
	import Stamp from '@pindoba/svelte-stamp';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import CleanupTargetList from '$domains/repository-cleanup/components/cleanup-target-list.svelte';
	import { getCleanupConfig } from '$domains/repository-cleanup/core/composables/use-cleanup-config.svelte';
	import { useStaleRepositories } from '$domains/repository-cleanup/core/composables/use-stale-repositories.svelte';
	import type { DeletionMode } from '$infrastructure/bindings';
	import EmptyState from '$ui/core/empty-state.svelte';
	import PageHeader from '$ui/patterns/page-header.svelte';
	import PageShell from '$ui/patterns/page-shell.svelte';
	import PageToolbar from '$ui/patterns/page-toolbar.svelte';
	import PageWell from '$ui/patterns/page-well.svelte';
	import ValidationHint from '$ui/patterns/validation-hint.svelte';
	import { formatBytes } from '$utils/format-bytes';
	import { css } from '@pindoba/styled-system/css';

	const stale = useStaleRepositories();

	let mode = $state<DeletionMode>(getCleanupConfig().defaultDeletionMode);
	let confirmText = $state('');
	let expanded = $state<string[]>([]);

	const needsTypedConfirm = $derived(mode === 'permanent');
	const typedConfirmOk = $derived(confirmText.trim().toLowerCase() === 'delete');

	let hintOpen = $state(false);

	// The reason the clean action can't run yet, if any. Drives the inline hint.
	const validationError = $derived.by(() => {
		if (stale.selectedCount === 0) return 'Select at least one repository to clean.';
		if (needsTypedConfirm && !typedConfirmOk) return 'Type “delete” to confirm permanent deletion.';
		return null;
	});

	// Clear the hint as soon as the requirement is met.
	$effect(() => {
		if (hintOpen && !validationError) {
			hintOpen = false;
		}
	});

	// Live elapsed time during the first-load scan; ticks on a light interval.
	let elapsedMs = $state(0);
	$effect(() => {
		if (!stale.isScanning) {
			elapsedMs = 0;
			return;
		}
		const start = Date.now();
		const id = setInterval(() => {
			elapsedMs = Date.now() - start;
		}, 100);
		return () => clearInterval(id);
	});

	const scanned = $derived(stale.progress?.scanned ?? 0);
	const scanTotal = $derived(stale.progress?.total ?? 0);
	const found = $derived(stale.progress?.found ?? 0);
	// Linear extrapolation from the work done so far → remaining time.
	const etaMs = $derived(
		scanned > 0 && scanTotal > scanned ? (elapsedMs / scanned) * (scanTotal - scanned) : 0
	);

	function staleDate(seconds: number): string {
		return new Date(seconds * 1000).toLocaleDateString();
	}

	async function handleClean() {
		if (stale.isCleaning) return;
		if (validationError) {
			hintOpen = true;
			return;
		}
		await stale.cleanSelected(mode);
		confirmText = '';
	}
</script>

{#snippet cleanupIcon()}
	<Stamp shape="square" size="sm" emphasis="secondary" feedback="neutral" shadow="sm">
		<Icon icon="lucide:brush-cleaning" width="16px" height="16px" />
	</Stamp>
{/snippet}

{#snippet headerActions()}
	<div class={css({ display: 'flex', alignItems: 'center', gap: 'xs' })}>
		<Loading loading={stale.isRefreshing} variant="busy" indicator>
			<Button
				emphasis="secondary"
				size="sm"
				onclick={() => stale.rescan()}
				disabled={stale.isScanning || stale.isRefreshing || stale.isCleaning}
				data-testid="cleanup-rescan"
			>
				Rescan
			</Button>
		</Loading>
		<Button
			emphasis="secondary"
			size="sm"
			shape="square"
			aria-label="Cleanup settings"
			onclick={() => goto(resolve('/settings/cleanup'))}
			data-testid="cleanup-settings-shortcut"
		>
			<Icon icon="lucide:settings" width="16px" height="16px" />
		</Button>
	</div>
{/snippet}

<PageShell testId="bulk-cleanup-view">
	<PageHeader
		leading={cleanupIcon as BannerProps['leading']}
		heading="Clean up stale repositories"
		subheading="Repositories with no recent activity, and the space their build folders would reclaim."
		trailing={headerActions as BannerProps['trailing']}
	/>

	<!-- The results well. Unpadded so the select-all bar and the action bar span
	     edge to edge; the accordion scroller re-establishes the inset as its own
	     cascade level, so the items inside stay concentric with the `xl` radius. -->
	<PageWell padded={false}>
		{#snippet toolbar()}
			{#if stale.repositoryCount > 0}
				<PageToolbar data-testid="cleanup-toolbar">
					{#snippet left()}
						<Checkbox
							checked={stale.allSelected}
							indeterminate={stale.someSelected}
							onchange={() => stale.setAll(!stale.allSelected)}
							data-testid="cleanup-select-all"
						>
							Select all
						</Checkbox>
					{/snippet}
					{#snippet right()}
						<span
							class={css({
								display: 'flex',
								alignItems: 'center',
								gap: 'xs',
								fontSize: 'sm',
								color: 'neutral.text.muted'
							})}
						>
							reclaimable
							<Badge size="sm" data-testid="cleanup-total">
								{formatBytes(stale.totalReclaimableBytes)}
							</Badge>
						</span>
					{/snippet}
				</PageToolbar>
			{/if}
		{/snippet}

		{#snippet footer()}
			{#if stale.repositoryCount > 0}
				<PageToolbar placement="bottom" data-testid="cleanup-actions">
					{#snippet left()}
						<Group orientation="horizontal">
							<Button
								size="sm"
								emphasis={mode === 'trash' ? 'primary' : 'secondary'}
								onclick={() => (mode = 'trash')}
								data-testid="cleanup-mode-trash"
							>
								Move to Trash
							</Button>
							<Button
								size="sm"
								emphasis={mode === 'permanent' ? 'primary' : 'secondary'}
								feedback={mode === 'permanent' ? 'danger' : undefined}
								onclick={() => (mode = 'permanent')}
								data-testid="cleanup-mode-permanent"
							>
								Delete permanently
							</Button>
						</Group>
						{#if needsTypedConfirm}
							<div class={css({ maxWidth: '200px' })}>
								<Input
									size="sm"
									placeholder="Type “delete” to confirm"
									aria-label="Type delete to confirm permanent deletion"
									bind:value={confirmText}
									data-testid="cleanup-confirm-input"
								/>
							</div>
						{/if}
					{/snippet}

					{#snippet right()}
						{#if stale.selectedCount > 0}
							<span
								class={css({ fontSize: 'sm', color: 'neutral.text.muted' })}
								data-testid="cleanup-selected-summary"
							>
								{stale.selectedCount.toLocaleString()}
								{stale.selectedCount === 1 ? 'repository' : 'repositories'}
							</span>
						{/if}
						<ValidationHint
							bind:open={hintOpen}
							message={validationError ?? ''}
							data-testid="cleanup-clean-validation"
						>
							{#snippet trigger(triggerProps)}
								<Loading loading={stale.isCleaning} variant="busy" indicator>
									<Button
										{...triggerProps}
										feedback="danger"
										onclick={handleClean}
										data-testid="cleanup-clean-selected"
									>
										{#if stale.selectedCount > 0}
											Clean {formatBytes(stale.selectedBytes)}
										{:else}
											Clean
										{/if}
									</Button>
								</Loading>
							{/snippet}
						</ValidationHint>
					{/snippet}
				</PageToolbar>
			{/if}
		{/snippet}

		{#if stale.isScanning}
			<div
				class={css({
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 'md',
					flex: '1',
					padding: 'xl',
					color: 'neutral.text.muted'
				})}
				data-testid="cleanup-scanning"
			>
				<span class={css({ fontSize: 'sm', fontWeight: 'medium', color: 'neutral.text' })}>
					Scanning repositories…
				</span>
				<div class={css({ width: 'full', maxWidth: '320px' })}>
					{#if scanTotal > 0}
						<Progress value={scanned} max={scanTotal} size="sm" />
					{:else}
						<Progress indeterminate size="sm" />
					{/if}
				</div>
				<div
					class={css({
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: '2xs'
					})}
				>
					<span class={css({ fontSize: 'sm' })} data-testid="cleanup-scan-counts">
						{scanned.toLocaleString()} of {scanTotal.toLocaleString()} examined · {found.toLocaleString()}
						{found === 1 ? 'repository' : 'repositories'} found
					</span>
					<span class={css({ fontSize: 'xs' })}>
						Elapsed {(elapsedMs / 1000).toFixed(1)}s{etaMs > 0
							? ` · ~${(etaMs / 1000).toFixed(0)}s remaining`
							: ''}
					</span>
				</div>
			</div>
		{:else if stale.hasScanned && stale.repositoryCount === 0}
			<EmptyState
				icon="lucide:sparkles"
				size="sm"
				message="No stale repositories with reclaimable space."
				testId="cleanup-empty"
			/>
		{:else if stale.repositoryCount > 0}
			<!-- Repositories as accordions. Transparent Panel so this scroller's
			     inset counts as a cascade level for the items inside it. -->
			<Panel
				background="transparent"
				border="none"
				radius="inner"
				padding="xs"
				class={css({
					display: 'flex',
					flexDirection: 'column',
					flex: '1',
					overflowY: 'auto'
				})}
			>
				<Accordion type="multiple" collapsible bind:value={expanded}>
					{#each stale.repositories as repo (repo.id)}
						<AccordionItem
							value={repo.id}
							radius="inner"
							title={repo.name}
							subtitle={`Last active ${staleDate(repo.staleSince)} · ${repo.path}`}
							bannerPassThrough={{
								root: { style: css.raw({ flex: '1', minWidth: '0' }) },
								headingGroup: { style: css.raw({ minWidth: '0' }) },
								subheadingContainer: {
									style: css.raw({ minWidth: '0', alignSelf: 'stretch' })
								},
								subheading: {
									style: css.raw({
										display: 'block',
										minWidth: '0',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap'
									})
								},
								trailing: { style: css.raw({ alignSelf: 'center', flexShrink: '0' }) }
							}}
							passThrough={{
								contentBody: { style: css.raw({ background: 'neutral.surface.hill' }) },
								actionsLeading: {
									style: css.raw({ alignSelf: 'flex-start', paddingTop: 'xs' })
								},
								trigger: {
									style: css.raw({ py: 'xs' })
								}
							}}
						>
							{#snippet actionsLeading()}
								<Checkbox
									checked={stale.isRepoAllSelected(repo.id)}
									indeterminate={stale.isRepoIndeterminate(repo.id)}
									onchange={() => stale.toggleRepo(repo.id, !stale.isRepoAllSelected(repo.id))}
									aria-label={`Select ${repo.name}`}
									data-testid="cleanup-repo-select"
								/>
							{/snippet}
							{#snippet trailing()}
								<Badge size="sm" emphasis="adaptive" data-testid="cleanup-repo-size">
									{formatBytes(repo.reclaimableBytes)}
								</Badge>
							{/snippet}
							<CleanupTargetList
								targets={repo.targets}
								isSelected={(path) => stale.isTargetSelected(repo.id, path)}
								onToggle={(path) => stale.toggleTarget(repo.id, path)}
							/>
						</AccordionItem>
					{/each}
				</Accordion>
			</Panel>
		{/if}
	</PageWell>
</PageShell>
