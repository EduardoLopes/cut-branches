<script lang="ts">
	import LucideSparkles from '@lucide/svelte/icons/sparkles';
	import Button from '@pindoba/svelte-button';
	import Choice, { ChoiceItem } from '@pindoba/svelte-choice';
	import Modal from '@pindoba/svelte-dialog';
	import Input from '@pindoba/svelte-input';
	import Loading from '@pindoba/svelte-loading';
	import Progress from '@pindoba/svelte-progress';
	import Stamp from '@pindoba/svelte-stamp';
	import CleanupTargetList from './cleanup-target-list.svelte';
	import { getCleanupConfig } from '$domains/repository-cleanup/core/composables/use-cleanup-config.svelte';
	import { useCleanupTargets } from '$domains/repository-cleanup/core/composables/use-cleanup-targets.svelte';
	import type { DeletionMode } from '$infrastructure/bindings';
	import { createGetRepositoryQuery } from '$infrastructure/queries/create-get-repository-query';
	import Icon from '$ui/core/icon.svelte';
	import DialogFooter from '$ui/patterns/dialog-footer.svelte';
	import DialogHeader from '$ui/patterns/dialog-header.svelte';
	import ScrollWell from '$ui/patterns/scroll-well.svelte';
	import ValidationHint from '$ui/patterns/validation-hint.svelte';
	import { formatBytes } from '$utils/format-bytes';
	import { portal } from '$utils/portal-action';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		open?: boolean;
		repositoryId: string;
	}

	let { open = $bindable(false), repositoryId }: Props = $props();

	// Resolve the repo's path/name from the shared repository query (global
	// infrastructure — not a cross-domain import).
	const repositoryQuery = createGetRepositoryQuery(() => ({ id: repositoryId }));
	const repositoryName = $derived(repositoryQuery.data?.name ?? repositoryId);
	const repositoryPath = $derived(repositoryQuery.data?.path ?? '');

	let started = $state(false);
	let mode = $state<DeletionMode>(getCleanupConfig().defaultDeletionMode);

	function setMode(value: string | undefined) {
		if (value === 'trash' || value === 'permanent') mode = value;
	}
	let confirmText = $state('');

	const cleanup = useCleanupTargets({
		onCleaned: () => {
			if (cleanup.targetCount === 0) open = false;
		}
	});

	// Permanent deletion is irreversible — require the user to type "delete".
	const needsTypedConfirm = $derived(mode === 'permanent');
	const typedConfirmOk = $derived(confirmText.trim().toLowerCase() === 'delete');

	let hintOpen = $state(false);

	// The reason the confirm action can't run yet, if any. Drives the inline hint.
	const validationError = $derived.by(() => {
		if (cleanup.selectedCount === 0) return 'Select at least one folder to clean.';
		if (needsTypedConfirm && !typedConfirmOk) return 'Type “delete” to confirm permanent deletion.';
		return null;
	});

	// Clear the hint as soon as the requirement is met.
	$effect(() => {
		if (hintOpen && !validationError) {
			hintOpen = false;
		}
	});

	$effect(() => {
		// Wait for the repository path to resolve before scanning.
		if (open && !started && repositoryPath) {
			started = true;
			mode = getCleanupConfig().defaultDeletionMode;
			confirmText = '';
			cleanup.scan(repositoryPath);
		}
		if (!open) {
			started = false;
		}
	});

	async function handleConfirm() {
		if (cleanup.isCleaning) return;
		if (validationError) {
			hintOpen = true;
			return;
		}
		await cleanup.clean(repositoryId, repositoryPath, mode);
		confirmText = '';
	}
</script>

<div use:portal>
	<Modal
		{open}
		onOpenChange={(next: boolean) => (open = next)}
		title="Clean up {repositoryName}"
		aria-label="Clean up repository"
		data-testid="clean-repository-modal"
		showCloseButton={!cleanup.isCleaning}
		passThrough={{
			root: {
				style: css.raw({ width: '640px', maxWidth: 'calc(100vw - token(spacing.2xl))' })
			}
		}}
	>
		{#snippet header()}
			<DialogHeader
				title="Clean up {repositoryName}"
				subtitle="Delete regenerable dependency and build folders to reclaim disk space. Review the folders below before continuing."
				icon={LucideSparkles}
			/>
		{/snippet}

		<div
			class={css({
				display: 'flex',
				flexDirection: 'column',
				gap: 'md',
				width: 'full',
				minHeight: '320px'
			})}
		>
			<!-- Results (fixed height so the modal doesn't resize between states) -->
			<div
				class={css({
					display: 'flex',
					flexDirection: 'column',
					gap: 'sm',
					height: '300px'
				})}
			>
				{#if cleanup.isScanning}
					<div
						class={css({
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 'md',
							flex: '1',
							paddingX: '2xl',
							color: 'neutral.text.muted'
						})}
						data-testid="cleanup-scanning"
					>
						<span class={css({ fontSize: 'sm', fontWeight: 'medium', color: 'neutral.text' })}>
							Measuring cleanable folders…
						</span>
						<div class={css({ width: 'full', maxWidth: '320px' })}>
							<Progress indeterminate size="sm" />
						</div>
						<span class={css({ fontSize: 'sm' })}>
							{(cleanup.progress?.measured ?? 0).toLocaleString()} measured
						</span>
					</div>
				{:else if cleanup.hasScanned && cleanup.targetCount === 0}
					<div
						class={css({
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 'sm',
							flex: '1',
							textAlign: 'center',
							color: 'neutral.text.muted'
						})}
						data-testid="cleanup-empty"
					>
						<Stamp shape="circle" size="lg" emphasis="secondary" tone="neutral">
							<Icon icon={LucideSparkles} width="20px" height="20px" />
						</Stamp>
						<span class={css({ fontSize: 'sm' })}>Nothing to clean up here.</span>
					</div>
				{:else if cleanup.targetCount > 0}
					<!-- The list's own sticky header carries select-all. The list
					     scrolls itself inside the well, so the header pins to its top. -->
					<ScrollWell
						class={css({ flex: '1', minHeight: '0' })}
						contained
						testId="cleanup-target-scroller"
					>
						<CleanupTargetList
							scroll
							padding="xs"
							targets={cleanup.targets}
							isSelected={(path) => cleanup.isSelected(path)}
							onToggle={(path) => cleanup.toggle(path)}
						/>
					</ScrollWell>
				{/if}
			</div>

			<!-- Deletion mode -->
			<div class={css({ display: 'flex', flexDirection: 'column', gap: 'xs' })}>
				<span class={css({ fontSize: 'xs', fontWeight: 'medium', color: 'neutral.text.muted' })}>
					Deletion method
				</span>
				<Choice
					type="radio"
					appearance="button"
					size="sm"
					value={[mode]}
					onValueChange={(value) => setMode(value[0])}
					aria-label="Deletion method"
				>
					<ChoiceItem value="trash" label="Move to Trash" data-testid="cleanup-mode-trash" />
					<ChoiceItem
						value="permanent"
						tone="danger"
						emphasis="primary"
						label="Delete permanently"
						data-testid="cleanup-mode-permanent"
					/>
				</Choice>
				<span class={css({ fontSize: 'xs', color: 'neutral.text.muted' })}>
					{mode === 'trash'
						? 'Folders go to your system Trash — recoverable until you empty it.'
						: 'Folders are permanently deleted. This cannot be undone.'}
				</span>
			</div>

			{#if needsTypedConfirm}
				<Input
					size="md"
					placeholder="Type “delete” to confirm"
					aria-label="Type delete to confirm permanent deletion"
					bind:value={confirmText}
					data-testid="cleanup-confirm-input"
				/>
			{/if}

			<DialogFooter>
				<Button
					emphasis="ghost"
					onclick={() => (open = false)}
					disabled={cleanup.isCleaning}
					data-testid="cleanup-cancel"
				>
					Cancel
				</Button>
				<ValidationHint
					bind:open={hintOpen}
					message={validationError ?? ''}
					data-testid="cleanup-confirm-validation"
				>
					{#snippet trigger(triggerProps)}
						<Loading loading={cleanup.isCleaning} variant="busy" indicator>
							<Button
								{...triggerProps}
								tone="danger"
								onclick={handleConfirm}
								disabled={cleanup.isScanning || cleanup.isCleaning}
								data-testid="cleanup-confirm"
							>
								{mode === 'trash' ? 'Move to Trash' : 'Delete'}
								{cleanup.selectedCount > 0 ? `(${formatBytes(cleanup.selectedBytes)})` : ''}
							</Button>
						</Loading>
					{/snippet}
				</ValidationHint>
			</DialogFooter>
		</div>
	</Modal>
</div>
