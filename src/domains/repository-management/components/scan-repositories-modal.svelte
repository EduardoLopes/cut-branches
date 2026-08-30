<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { MenuNode } from '@pindoba/core-menu';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Dialog from '@pindoba/svelte-dialog';
	import Group from '@pindoba/svelte-group';
	import Input from '@pindoba/svelte-input';
	import Loading from '@pindoba/svelte-loading';
	import Menu from '@pindoba/svelte-menu';
	import Panel from '@pindoba/svelte-panel';
	import Progress from '@pindoba/svelte-progress';
	import Stamp from '@pindoba/svelte-stamp';
	import { open as openFolderDialog } from '@tauri-apps/plugin-dialog';
	import { useDiscoverRepositories } from '../core/composables/use-discover-repositories.svelte';
	import { notifications } from '$services/notifications/notifications.svelte';
	import ValidationHint from '$ui/patterns/validation-hint.svelte';
	import { portal } from '$utils/portal-action';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** Controls dialog visibility. */
		open?: boolean;
		/**
		 * Where to scan when the dialog opens:
		 * - `home`: scan the user's home directory immediately
		 * - `folder`: prompt for a folder, then scan it
		 */
		scope?: 'home' | 'folder';
	}

	let { open = $bindable(false), scope = 'home' }: Props = $props();

	// `null` roots means "scan home"; a non-empty array scans those folders.
	let customRoots = $state<string[] | null>(null);
	// Guards the open-effect so the initial scan runs once per opening.
	let started = $state(false);
	// Local scanning flag with a floor duration so a fast scan doesn't flash the
	// spinner and snap the modal's shape (see `runScan`).
	let scanning = $state(false);
	const MIN_SCAN_MS = 300;
	// Elapsed time shown while scanning; ticks on a light interval.
	let elapsedMs = $state(0);
	// Whether to also surface linked git worktrees (off by default — a worktree
	// shares its repo with the main worktree, so it isn't a standalone repo).
	let includeWorktrees = $state(false);

	$effect(() => {
		if (!scanning) {
			elapsedMs = 0;
			return;
		}
		const start = Date.now();
		const id = setInterval(() => {
			elapsedMs = Date.now() - start;
		}, 100);
		return () => clearInterval(id);
	});

	const discover = useDiscoverRepositories({
		onAdded: () => {
			// Close the dialog as soon as the add succeeds — the newly added repos
			// show up in the sidebar list.
			open = false;
		}
	});

	let hintOpen = $state(false);

	// Clear the validation hint once the user selects something to add.
	$effect(() => {
		if (hintOpen && discover.selectedCount > 0) {
			hintOpen = false;
		}
	});

	function handleAdd() {
		if (discover.selectedCount === 0) {
			hintOpen = true;
			return;
		}
		discover.addSelected();
	}

	// A directory walk has no known total, so a time-to-finish can't be
	// predicted; surface the live throughput (folders/s) as the useful signal.
	const scanRate = $derived(
		elapsedMs > 250 ? Math.round((discover.progress?.scannedDirs ?? 0) / (elapsedMs / 1000)) : 0
	);

	const scanLabel = $derived(
		customRoots && customRoots.length > 0 ? customRoots.join(', ') : 'Your home folder'
	);

	// Free-text filter over the scan results (view only — selection and counts
	// still track the full result set).
	let searchQuery = $state('');
	const query = $derived(searchQuery.trim().toLowerCase());
	const filteredResults = $derived(
		query
			? discover.results.filter(
					(item) =>
						item.name.toLowerCase().includes(query) || item.path.toLowerCase().includes(query)
				)
			: discover.results
	);

	const allSelected = $derived(
		discover.addableCount > 0 && discover.selectedCount === discover.addableCount
	);
	// Some, but not all, addable repositories selected → the select-all control
	// shows the indeterminate ("mixed") state.
	const someSelected = $derived(
		discover.selectedCount > 0 && discover.selectedCount < discover.addableCount
	);

	async function runScan() {
		// A fresh scan replaces the results, so a stale filter shouldn't hide them.
		searchQuery = '';
		scanning = true;
		const startedAt = Date.now();
		try {
			await discover.scan(customRoots ?? [], includeWorktrees);
		} catch {
			// The mutation already surfaces an error notification via its meta.
		} finally {
			// Keep the spinner up for a minimum time so a sub-100ms scan doesn't
			// flicker the loading state and resize the modal in a jarring flash.
			const elapsed = Date.now() - startedAt;
			if (elapsed < MIN_SCAN_MS) {
				await new Promise((resolve) => setTimeout(resolve, MIN_SCAN_MS - elapsed));
			}
			scanning = false;
		}
	}

	async function chooseFolder(closeOnCancel = false) {
		try {
			const dir = await openFolderDialog({ directory: true, multiple: false });
			if (dir === null) {
				// Picker cancelled. When the dialog auto-opened straight into the
				// picker there is nothing to show, so close instead of leaving an
				// empty well behind. From the in-dialog button, keep the current
				// results and selection.
				if (closeOnCancel) open = false;
				return;
			}
			customRoots = [dir as string];
			await runScan();
		} catch (error) {
			notifications.push({
				title: 'Error',
				message: error instanceof Error ? error.message : String(error),
				feedback: 'danger'
			});
		}
	}

	function scanHome() {
		customRoots = null;
		runScan();
	}

	$effect(() => {
		if (open && !started) {
			started = true;
			if (scope === 'folder') {
				chooseFolder(true);
			} else {
				scanHome();
			}
		}
		if (!open) {
			started = false;
			searchQuery = '';
		}
	});

	function handleOpenChange(next: boolean) {
		open = next;
	}
</script>

<div use:portal>
	<Dialog
		{open}
		onChange={handleOpenChange}
		title="Find repositories"
		aria-label="Find git repositories"
		data-testid="scan-repositories-modal"
		passThrough={{
			root: {
				style: css.raw({
					width: '640px',
					maxWidth: 'calc(100vw - token(spacing.2xl))'
				})
			}
		}}
	>
		<div
			class={css({
				display: 'flex',
				flexDirection: 'column',
				gap: 'lg',
				width: 'full',
				minHeight: '320px'
			})}
		>
			<p class={css({ margin: '0', color: 'neutral.text.muted', fontSize: 'sm' })}>
				Scan a location on this computer for git repositories, then choose which ones to add.
			</p>

			<!-- Location controls -->
			<div
				class={css({
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: 'md',
					padding: 'md',
					borderRadius: 'lg',
					borderWidth: '1px',
					borderStyle: 'solid',
					borderColor: 'neutral.border.muted',
					background: 'neutral.surface.peak'
				})}
			>
				<div class={css({ display: 'flex', alignItems: 'center', gap: 'sm', minWidth: '0' })}>
					<Stamp emphasis="ghost" border="none" background="transparent">
						<Icon icon="lucide:folder-search" width="18px" height="18px" />
					</Stamp>
					<span
						class={css({
							fontSize: 'sm',
							fontWeight: 'medium',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap'
						})}
						data-testid="scan-location"
					>
						{scanLabel}
					</span>
				</div>
				<div class={css({ flexShrink: '0' })}>
					{#snippet homeIcon()}
						<Stamp size="sm" emphasis="ghost" border="none" background="transparent">
							<Icon icon="lucide:house" width="14px" height="14px" />
						</Stamp>
					{/snippet}

					<Group orientation="horizontal">
						<Button
							emphasis="secondary"
							size="sm"
							onclick={() => chooseFolder()}
							disabled={scanning}
							data-testid="choose-folder-button"
						>
							Choose folder…
						</Button>
						<Menu
							placement="bottom-end"
							aria-label="Scan location options"
							items={[
								{
									type: 'action',
									id: 'home',
									label: 'Home folder',
									leading: homeIcon,
									disabled: scanning,
									onSelect: scanHome
								} satisfies MenuNode
							]}
						>
							{#snippet trigger(triggerProps)}
								<Button
									emphasis="secondary"
									size="sm"
									shape="square"
									aria-label="More scan locations"
									disabled={scanning}
									data-testid="scan-location-menu-trigger"
									{...triggerProps}
								>
									<Stamp emphasis="ghost" border="none" background="transparent">
										<Icon icon="lucide:chevron-down" width="16px" height="16px" />
									</Stamp>
								</Button>
							{/snippet}
						</Menu>
					</Group>
				</div>
			</div>

			<div class={css({ display: 'flex', alignItems: 'center', gap: 'xs' })}>
				<Checkbox
					id="scan-include-worktrees"
					checked={includeWorktrees}
					disabled={scanning}
					onchange={() => {
						includeWorktrees = !includeWorktrees;
						// Re-run so the results reflect the new setting immediately.
						if (discover.hasScanned) runScan();
					}}
					data-testid="scan-include-worktrees"
				>
					Include linked worktrees
				</Checkbox>
			</div>

			<!-- Results panel (fixed height so the modal doesn't resize between states) -->
			<Panel
				background="surface.peak"
				border="muted"
				radius="lg"
				padding="none"
				class={css({
					display: 'flex',
					flexDirection: 'column',
					height: '320px',
					overflow: 'hidden'
				})}
			>
				{#if scanning}
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
						data-testid="scan-loading"
					>
						<span class={css({ fontSize: 'sm', fontWeight: 'medium', color: 'neutral.text' })}>
							Scanning for repositories…
						</span>
						<div class={css({ width: 'full', maxWidth: '320px' })}>
							<Progress indeterminate size="sm" />
						</div>
						<div
							class={css({
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: '2xs'
							})}
						>
							<span
								class={css({ fontSize: 'sm', color: 'neutral.text.muted' })}
								data-testid="scan-progress-counts"
							>
								{(discover.progress?.scannedDirs ?? 0).toLocaleString()}
								{(discover.progress?.scannedDirs ?? 0) === 1 ? 'folder' : 'folders'} scanned ·
								{(discover.progress?.foundCount ?? 0).toLocaleString()}
								{(discover.progress?.foundCount ?? 0) === 1 ? 'repository' : 'repositories'} found
							</span>
							<span class={css({ fontSize: 'xs', color: 'neutral.text.muted' })}>
								Elapsed {(elapsedMs / 1000).toFixed(1)}s{scanRate > 0
									? ` · ${scanRate.toLocaleString()} folders/s`
									: ''}
							</span>
						</div>
					</div>
				{:else if discover.hasScanned && discover.results.length === 0}
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
						data-testid="scan-empty"
					>
						<Stamp shape="circle" size="lg" emphasis="secondary" feedback="neutral">
							<Icon icon="lucide:search-x" width="20px" height="20px" />
						</Stamp>
						<span class={css({ fontSize: 'sm' })}>No git repositories found in this location.</span>
						<span class={css({ fontSize: 'xs' })} data-testid="scan-summary">
							Scanned {(discover.progress?.scannedDirs ?? 0).toLocaleString()}
							{(discover.progress?.scannedDirs ?? 0) === 1 ? 'folder' : 'folders'}
						</span>
					</div>
				{:else if discover.results.length > 0}
					<!-- List header (anchored one step deeper than the rows well) -->
					<div
						class={css({
							display: 'flex',
							flexDirection: 'column',
							gap: '2xs',
							paddingX: 'sm',
							paddingY: 'xs',
							borderBottomWidth: '1px',
							borderBottomStyle: 'solid',
							borderBottomColor: 'neutral.border.muted',
							background: 'neutral.surface.hill'
						})}
					>
						<Input
							type="search"
							size="sm"
							placeholder="Filter results"
							aria-label="Filter results"
							bind:value={searchQuery}
							data-testid="scan-search"
						>
							{#snippet leading()}
								<Stamp size="sm" emphasis="ghost" border="none" background="transparent">
									<Icon icon="lucide:search" width="14px" height="14px" />
								</Stamp>
							{/snippet}
						</Input>
						<span
							class={css({ fontSize: 'xs', color: 'neutral.text.muted' })}
							data-testid="scan-summary"
						>
							Found {discover.results.length.toLocaleString()}
							{discover.results.length === 1 ? 'repository' : 'repositories'} ·
							{(discover.progress?.scannedDirs ?? 0).toLocaleString()}
							{(discover.progress?.scannedDirs ?? 0) === 1 ? 'folder' : 'folders'} scanned
						</span>
						<div
							class={css({
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between'
							})}
						>
							<Checkbox
								id="scan-select-all"
								checked={allSelected}
								indeterminate={someSelected}
								disabled={discover.addableCount === 0}
								onchange={() => discover.setAll(!allSelected)}
								data-testid="scan-select-all"
							>
								Select all
							</Checkbox>
							<span class={css({ fontSize: 'xs', color: 'neutral.text.muted' })}>
								{discover.selectedCount} of {discover.addableCount} selected
							</span>
						</div>
					</div>

					<!-- Rows. A transparent Panel rather than a plain div so this
					     scroller's inset counts as a nesting level and the rows can ask
					     for `radius="inner"` instead of pinning a tier. -->
					<Panel
						background="transparent"
						border="none"
						radius="inner"
						padding="2xs"
						class={css({
							display: 'flex',
							flexDirection: 'column',
							gap: '3xs',
							flex: '1',
							overflowY: 'auto'
						})}
					>
						{#each filteredResults as item (item.path)}
							{@const selected = discover.isSelected(item.path)}
							<Checkbox
								fullWidth
								checked={item.alreadyAdded || selected}
								disabled={item.alreadyAdded}
								onchange={() => discover.toggle(item.path)}
								aria-label={item.name}
								data-testid="scan-item"
								radius="inner"
								class={css({
									paddingX: 'sm',
									paddingY: 'xs',
									opacity: item.alreadyAdded ? 0.6 : 1,
									background:
										selected && !item.alreadyAdded ? 'neutral.surface.base' : 'transparent',
									_hover: {
										background: item.alreadyAdded
											? undefined
											: selected
												? 'neutral.surface.valley'
												: 'neutral.surface.hill'
									}
								})}
							>
								<span
									class={css({
										display: 'flex',
										flexDirection: 'column',
										gap: '2xs',
										minWidth: '0'
									})}
								>
									<span class={css({ fontSize: 'sm', fontWeight: 'medium' })}>{item.name}</span>
									<span
										class={css({
											fontSize: 'xs',
											color: 'neutral.text.muted',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap'
										})}
									>
										{item.path}
									</span>
								</span>
								{#snippet trailing()}
									{#if item.alreadyAdded}
										<Badge
											size="sm"
											emphasis="secondary"
											feedback="success"
											data-testid="scan-item-added"
										>
											Added
										</Badge>
									{/if}
								{/snippet}
							</Checkbox>
						{:else}
							<div
								class={css({
									display: 'flex',
									flex: '1',
									alignItems: 'center',
									justifyContent: 'center',
									textAlign: 'center',
									color: 'neutral.text.muted',
									fontSize: 'sm'
								})}
								data-testid="scan-no-matches"
							>
								No repositories match your filter.
							</div>
						{/each}
					</Panel>
				{/if}
			</Panel>

			<!-- Footer -->
			<div
				class={css({
					display: 'flex',
					justifyContent: 'flex-end',
					gap: 'sm',
					paddingTop: 'md',
					borderTopWidth: '1px',
					borderTopStyle: 'solid',
					borderTopColor: 'neutral.border.muted'
				})}
			>
				<Button emphasis="ghost" onclick={() => (open = false)} data-testid="scan-cancel">
					Close
				</Button>
				<ValidationHint
					bind:open={hintOpen}
					message="Select at least one repository to add."
					data-testid="scan-add-validation"
				>
					{#snippet trigger(triggerProps)}
						<Loading loading={discover.isAdding} variant="busy" indicator>
							<Button
								{...triggerProps}
								emphasis="primary"
								onclick={handleAdd}
								data-testid="scan-add-selected"
							>
								Add {discover.selectedCount}
								{discover.selectedCount === 1 ? 'repository' : 'repositories'}
							</Button>
						</Loading>
					{/snippet}
				</ValidationHint>
			</div>
		</div>
	</Dialog>
</div>
