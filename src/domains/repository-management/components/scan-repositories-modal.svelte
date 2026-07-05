<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Dialog from '@pindoba/svelte-dialog';
	import Loading from '@pindoba/svelte-loading';
	import Stamp from '@pindoba/svelte-stamp';
	import { open as openFolderDialog } from '@tauri-apps/plugin-dialog';
	import { useDiscoverRepositories } from '../core/composables/use-discover-repositories.svelte';
	import { notifications } from '$services/notifications/notifications.svelte';
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

	const discover = useDiscoverRepositories({
		onAdded: () => {
			// Leave the dialog open so the user can review what remains, but if
			// nothing is left to add, close it.
			if (discover.addableCount === 0) {
				open = false;
			}
		}
	});

	const scanLabel = $derived(
		customRoots && customRoots.length > 0 ? customRoots.join(', ') : 'Your home folder'
	);

	const allSelected = $derived(
		discover.addableCount > 0 && discover.selectedCount === discover.addableCount
	);

	async function runScan() {
		try {
			await discover.scan(customRoots ?? []);
		} catch {
			// The mutation already surfaces an error notification via its meta.
		}
	}

	async function chooseFolder() {
		try {
			const dir = await openFolderDialog({ directory: true, multiple: false });
			if (dir !== null) {
				customRoots = [dir as string];
				await runScan();
			}
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
				chooseFolder();
			} else {
				scanHome();
			}
		}
		if (!open) {
			started = false;
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
		<div class={css({ display: 'flex', flexDirection: 'column', gap: 'lg', minHeight: '320px' })}>
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
					background: 'neutral.surface.soft'
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
				<div class={css({ display: 'flex', gap: 'sm', flexShrink: '0' })}>
					<Button
						emphasis="ghost"
						size="sm"
						onclick={scanHome}
						disabled={discover.isScanning}
						data-testid="scan-home-button"
					>
						Home folder
					</Button>
					<Button
						emphasis="secondary"
						size="sm"
						onclick={chooseFolder}
						disabled={discover.isScanning}
						data-testid="choose-folder-button"
					>
						Choose folder…
					</Button>
				</div>
			</div>

			<!-- Results -->
			<div class={css({ position: 'relative', flex: '1', minHeight: '160px' })}>
				{#if discover.isScanning}
					<div
						class={css({
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 'sm',
							height: 'full',
							color: 'neutral.text.muted'
						})}
						data-testid="scan-loading"
					>
						<Loading loading />
						<span class={css({ fontSize: 'sm' })}>Scanning for repositories…</span>
					</div>
				{:else if discover.hasScanned && discover.results.length === 0}
					<div
						class={css({
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 'sm',
							height: 'full',
							textAlign: 'center',
							color: 'neutral.text.muted'
						})}
						data-testid="scan-empty"
					>
						<Stamp shape="circle" size="lg" emphasis="secondary" feedback="neutral">
							<Icon icon="lucide:search-x" width="20px" height="20px" />
						</Stamp>
						<span class={css({ fontSize: 'sm' })}>No git repositories found in this location.</span>
					</div>
				{:else if discover.results.length > 0}
					<div class={css({ display: 'flex', flexDirection: 'column', gap: 'xs' })}>
						<div
							class={css({
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								paddingBottom: 'xs',
								borderBottom: '1px solid',
								borderColor: 'neutral.border.muted'
							})}
						>
							<Checkbox
								id="scan-select-all"
								checked={allSelected}
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

						<div
							class={css({
								display: 'flex',
								flexDirection: 'column',
								gap: '2xs',
								maxHeight: '260px',
								overflowY: 'auto',
								paddingTop: 'xs'
							})}
						>
							{#each discover.results as item (item.path)}
								<Checkbox
									id={`scan-item-${item.path}`}
									checked={item.alreadyAdded || discover.isSelected(item.path)}
									disabled={item.alreadyAdded}
									onchange={() => discover.toggle(item.path)}
									data-testid="scan-item"
								>
									<span class={css({ display: 'flex', flexDirection: 'column' })}>
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
											<span
												class={css({ fontSize: 'xs', color: 'primary.text' })}
												data-testid="scan-item-added"
											>
												Added
											</span>
										{/if}
									{/snippet}
								</Checkbox>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class={css({ display: 'flex', justifyContent: 'flex-end', gap: 'sm' })}>
				<Button emphasis="ghost" onclick={() => (open = false)} data-testid="scan-cancel">
					Close
				</Button>
				<Button
					emphasis="primary"
					onclick={discover.addSelected}
					disabled={discover.selectedCount === 0 || discover.isAdding}
					data-testid="scan-add-selected"
				>
					{discover.isAdding
						? 'Adding…'
						: `Add ${discover.selectedCount} ${
								discover.selectedCount === 1 ? 'repository' : 'repositories'
							}`}
				</Button>
			</div>
		</div>
	</Dialog>
</div>
