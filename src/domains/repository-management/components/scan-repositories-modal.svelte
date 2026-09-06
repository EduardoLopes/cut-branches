<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { MenuNode } from '@pindoba/core-menu';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Dialog from '@pindoba/svelte-dialog';
	import Group from '@pindoba/svelte-group';
	import Loading from '@pindoba/svelte-loading';
	import Menu from '@pindoba/svelte-menu';
	import Progress from '@pindoba/svelte-progress';
	import Stamp from '@pindoba/svelte-stamp';
	import { open as openFolderDialog } from '@tauri-apps/plugin-dialog';
	import {
		useDiscoverRepositories,
		type DiscoveredItem
	} from '../core/composables/use-discover-repositories.svelte';
	import { groupDiscoveredRepositories } from '../utils/group-discovered-repositories';
	import { notifications } from '$services/notifications/notifications.svelte';
	import TruncatedPath from '$ui/core/truncated-path.svelte';
	import DialogFooter from '$ui/patterns/dialog-footer.svelte';
	import DialogHeader from '$ui/patterns/dialog-header.svelte';
	import DialogToolbar from '$ui/patterns/dialog-toolbar.svelte';
	import ListFilter from '$ui/patterns/list-filter.svelte';
	import ScrollWell from '$ui/patterns/scroll-well.svelte';
	import SelectionRow from '$ui/patterns/selection-row.svelte';
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
	// Elapsed time shown while scanning; ticks on a light interval.
	let elapsedMs = $state(0);
	// Whether to also surface linked git worktrees (off by default — a worktree
	// shares its repo with the main worktree, so it isn't a standalone repo).
	let includeWorktrees = $state(false);

	const discover = useDiscoverRepositories({
		onAdded: () => {
			// Close the dialog as soon as the add succeeds — the newly added repos
			// show up in the sidebar list.
			open = false;
		}
	});

	// The composable owns the scanning flag — including the minimum duration that
	// keeps a fast scan from flashing the spinner — and it already discards a
	// superseded run, so there is nothing to mirror locally.
	const scanning = $derived(discover.isScanning);

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

	// One-line outcome of the last scan, shown in the toolbar once it is done.
	const scanSummary = $derived.by(() => {
		const dirs = discover.progress?.scannedDirs ?? 0;
		const found = discover.results.length;
		return `${found.toLocaleString()} ${found === 1 ? 'repository' : 'repositories'} · ${dirs.toLocaleString()} ${dirs === 1 ? 'folder' : 'folders'} scanned`;
	});

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

	// Linked worktrees sit under the repository they belong to.
	const groups = $derived(groupDiscoveredRepositories(filteredResults));

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
		try {
			await discover.scan(customRoots ?? [], includeWorktrees);
		} catch {
			// The mutation already surfaces an error notification via its meta.
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
			// Closing abandons the scan: reopening starts a fresh one instead of
			// racing the old walk, whose results would land on top of the new ones.
			discover.cancelScan();
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
					width: '720px',
					maxWidth: 'calc(100vw - token(spacing.2xl))'
				})
			}
		}}
	>
		{#snippet header()}
			<DialogHeader
				title="Find repositories"
				subtitle="Scan a location on this computer for git repositories, then choose which ones to add."
				icon="lucide:folder-search"
			/>
		{/snippet}

		<!-- Scan toolbar: two fixed rows — the path chip flexes to fill the first
		     one — so choosing a long folder never changes the toolbar height. -->
		<DialogToolbar testId="scan-toolbar">
			<!-- Row 1: where the scan looks -->
			<div class={css({ display: 'flex', alignItems: 'center', gap: 'xs' })}>
				<!-- Sized with the `control.sm` tokens so the chip reads as a peer of
				     the sm buttons beside it (same height and corner). With the line
				     height pinned to the glyphs, the horizontal padding equals the
				     vertical inset left over by the control height, so the inset is
				     the same on all four sides. -->
				<span
					class={css({
						flex: '1',
						minWidth: '0',
						display: 'flex',
						alignItems: 'center',
						height: 'control.sm',
						lineHeight: 'none',
						paddingX: 'calc((token(sizes.control.sm) - token(fontSizes.xs)) / 2)',
						borderRadius: 'control.sm',
						fontSize: 'xs',
						fontFamily: 'mono',
						background: 'neutral.surface.valley',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap'
					})}
					title={scanLabel}
					data-testid="scan-location"
				>
					{scanLabel}
				</span>

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
						Change folder
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

			<!-- Row 2: scan options on the left, last outcome + rescan on the right -->
			<div
				class={css({
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: 'sm'
				})}
			>
				<Checkbox
					id="scan-include-worktrees"
					size="sm"
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
				<div class={css({ display: 'flex', alignItems: 'center', gap: '2xs', minWidth: '0' })}>
					{#if discover.hasScanned && !scanning}
						<span
							class={css({
								fontSize: 'xs',
								color: 'neutral.text.muted',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap'
							})}
							data-testid="scan-summary"
						>
							{scanSummary}
						</span>
					{/if}
					<Button
						emphasis="ghost"
						border="muted"
						size="sm"
						shape="square"
						aria-label="Scan again"
						onclick={runScan}
						disabled={scanning}
						data-testid="scan-rescan-button"
					>
						<Stamp emphasis="ghost" border="none" background="transparent">
							<Icon icon="lucide:refresh-cw" width="14px" height="14px" />
						</Stamp>
					</Button>
				</div>
			</div>
		</DialogToolbar>

		<div
			class={css({
				display: 'flex',
				flexDirection: 'column',
				gap: 'lg',
				width: 'full',
				minHeight: '320px'
			})}
		>
			<!-- Results (fixed height so the modal doesn't resize between states).
			     No overflow clip here: the filter input's focus ring must be free to
			     draw outside the header; only the rows scroller clips. -->
			<div
				class={css({
					display: 'flex',
					flexDirection: 'column',
					height: '320px'
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
						<span class={css({ fontSize: 'xs' })}
							>Try another folder or include linked worktrees.</span
						>
					</div>
				{:else if discover.results.length > 0}
					<!-- List header. Only the filter sits outside the well; select-all
					     belongs to the list, so it rides in the well's own header. -->
					<div class={css({ paddingBottom: 'sm' })}>
						<ListFilter
							bind:value={searchQuery}
							placeholder="Filter results"
							matchCount={filteredResults.length}
							total={discover.results.length}
							testId="scan-search"
						/>
					</div>

					{#snippet row(item: DiscoveredItem)}
						{@const selected = discover.isSelected(item.path)}
						<SelectionRow
							checked={item.alreadyAdded || selected}
							disabled={item.alreadyAdded}
							muted={item.alreadyAdded}
							onchange={() => discover.toggle(item.path)}
							ariaLabel={item.name}
							testId="scan-item"
						>
							<!-- One line: the name leads, the path takes the rest. The path is
							     end-aligned with the folder highlighted so it lands in the same
							     column on every row however deep the path is. -->
							<span
								class={css({
									display: 'flex',
									alignItems: 'center',
									gap: 'sm',
									minWidth: '0'
								})}
							>
								<span class={css({ fontSize: 'sm', fontWeight: 'medium', flexShrink: '0' })}>
									{item.name}
								</span>
								{#if item.isWorktree}
									<Badge size="sm" feedback="warning" data-testid="scan-item-worktree">
										{#snippet leading()}
											<Stamp emphasis="ghost"><Icon icon="lucide:trees" /></Stamp>
										{/snippet}
										worktree
									</Badge>
								{/if}
								<!-- The column, not the segment count, caps the path: short paths
								     show whole, deep ones truncate to fit the column. `flex: 1`
								     keeps the box width independent of its text so the fitter
								     never chases its own output. -->
								<TruncatedPath
									path={item.path}
									highlight={item.name}
									align="end"
									class={css({
										flex: '1',
										maxWidth: '60%',
										marginLeft: 'auto',
										fontSize: 'xs'
									})}
									data-testid="scan-item-path"
								/>
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
						</SelectionRow>
					{/snippet}

					{#snippet listHeader()}
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
					{/snippet}

					<ScrollWell
						class={css({ flex: '1', minHeight: '0' })}
						header={listHeader}
						testId="scan-results-scroller"
					>
						{#each groups as group (group.item.path)}
							{@render row(group.item)}
							{#if group.worktrees.length > 0}
								<!-- Indented with a guide line so the worktrees read as part of
								     the repository above, not as more repositories. The 1px line is
								     centred on the parent's checkbox: the row's `sm` inset plus half
								     the `md` checkbox box (2rem), minus half the line itself. -->
								<div
									class={css({
										display: 'flex',
										flexDirection: 'column',
										gap: '3xs',
										marginLeft: 'calc(token(spacing.sm) + 1rem - 0.5px)',
										paddingLeft: 'xs',
										borderLeftWidth: '1px',
										borderLeftStyle: 'solid',
										borderLeftColor: 'neutral.border.muted'
									})}
									data-testid="scan-item-worktrees"
								>
									{#each group.worktrees as worktree (worktree.path)}
										{@render row(worktree)}
									{/each}
								</div>
							{/if}
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
					</ScrollWell>
				{/if}
			</div>

			<DialogFooter>
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
								disabled={scanning}
								data-testid="scan-add-selected"
							>
								Add {discover.selectedCount}
								{discover.selectedCount === 1 ? 'repository' : 'repositories'}
							</Button>
						</Loading>
					{/snippet}
				</ValidationHint>
			</DialogFooter>
		</div>
	</Dialog>
</div>
