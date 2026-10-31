<script lang="ts">
	import LucideGitBranch from '@lucide/svelte/icons/git-branch';
	import LucideHouse from '@lucide/svelte/icons/house';
	import LucideLock from '@lucide/svelte/icons/lock';
	import LucideLockOpen from '@lucide/svelte/icons/lock-open';
	import LucideTrees from '@lucide/svelte/icons/trees';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import GridList from '@pindoba/svelte-grid-list';
	import Loading from '@pindoba/svelte-loading';
	import Stamp from '@pindoba/svelte-stamp';
	import Tooltip from '@pindoba/svelte-tooltip';
	import { type Worktree } from '../core/models/worktree';
	import EmptyState from '$ui/core/empty-state.svelte';
	import Icon from '$ui/core/icon.svelte';
	import TruncatedPath from '$ui/core/truncated-path.svelte';
	import { css } from '@pindoba/styled-system/css';
	import { visuallyHidden } from '@pindoba/styled-system/patterns';

	interface Props {
		worktrees: Worktree[];
		isLoading?: boolean;
		busy?: boolean;
		/** Whether rows carry selection checkboxes (the list's own). */
		allowSelection?: boolean;
		/** The selected worktree names. */
		selected?: ReadonlySet<string>;
		/** The list changed the selection (a checkbox, x/Space, a Shift range, ⌘A, Esc). */
		onSelectionChange?: (names: Set<string>) => void;
		onLock: (worktree: Worktree) => void;
		onUnlock: (worktree: Worktree) => void;
		/** Bindable: the list's root, e.g. for a bulk bar's `returnFocus` via
		 *  `gridListFocusTarget`. */
		element?: HTMLDivElement | null;
	}

	let {
		worktrees,
		isLoading = false,
		busy = false,
		allowSelection = false,
		selected = new Set<string>(),
		onSelectionChange = () => {},
		onLock,
		onUnlock,
		element = $bindable()
	}: Props = $props();

	// The main worktree can't be removed and a locked one is protected until
	// unlocked: both keep their row (and the lock control) but never join a
	// selection — not by click, range, ⌘A or the toolbar's select-all.
	const disabledIds = $derived(
		new Set(worktrees.filter((w) => w.isMain() || w.isLocked()).map((w) => w.getName()))
	);
	// A fresh Set per change: GridList adopts a new `value` by identity.
	const value = $derived(new Set(selected));

	// Room for the last row to scroll out from under the well's bulk bar, only
	// while the bar is up (something is selected). Reserved for good, it would
	// make a list that fits scroll through empty space.
	const barClearanceClass = css({
		'--gl-scroll-end-inset': 'var(--page-well-overlay-clearance, 0px)'
	});

	// Hoisted: `css()` is a runtime merge, not worth repeating per row.
	const statusCellClass = css({ justifyContent: 'center', color: 'neutral.text.muted' });
	const nameCellClass = css({ display: 'grid', gap: '3xs', minWidth: '0' });
	const lineClass = css({ display: 'flex', alignItems: 'center', gap: 'xs', minWidth: '0' });
	const nameClass = css({ fontWeight: 'semibold', truncate: true });
	const branchClass = css({ fontSize: 'sm', color: 'neutral.text.muted', truncate: true });
	const shaClass = css({
		flexShrink: '0',
		fontSize: 'xs',
		fontFamily: 'mono',
		color: 'neutral.text.muted'
	});
	const pathClass = css({ fontSize: 'xs', minWidth: '0' });
	const actionsCellClass = css({ justifyContent: 'flex-end' });
</script>

<!-- Surface comes from the enclosing PageWell, which is unpadded for this view.
     The list scrolls its own grid (see branch-list): its `xs` padding stays
     outside the scroll area and the sticky header pins inside it. -->
<div
	class={css({
		display: 'flex',
		flexDirection: 'column',
		flex: 1,
		minHeight: '0'
	})}
	data-testid="worktree-list"
>
	{#if isLoading}
		<div
			class={css({
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 'sm',
				paddingY: '2xl',
				color: 'neutral.text.muted'
			})}
			data-testid="worktree-list-loading"
		>
			<Loading loading variant="busy" indicator />
			<span class={css({ fontSize: 'sm' })}>Loading worktrees…</span>
		</div>
	{:else if worktrees.length === 0}
		<EmptyState
			icon={LucideTrees}
			size="sm"
			message="No worktrees found."
			testId="worktree-list-empty"
		/>
	{:else}
		<!-- The sticky header carries select-all (⌘A does the same from a
		     focused row). Narrower than 640px the path drops and the row keeps
		     its two lines. -->
		<GridList
			bind:element
			scroll
			padding="xs"
			class={selected.size > 0 ? barClearanceClass : undefined}
			label="Worktrees"
			items={worktrees}
			getId={(worktree: Worktree) => worktree.getName()}
			rowName={(worktree: Worktree) => worktree.getName()}
			selectable={allowSelection}
			header
			{value}
			{disabledIds}
			onValueChange={onSelectionChange}
			tone="danger"
			look="cards"
			rowBackground="surface.peak"
			selectOver="status"
			columns={[
				// The worktree's glyph, with the checkbox laid over it. Main and
				// locked worktrees can't be selected, so theirs (house, lock) stays.
				{ id: 'status', track: 'auto', srHeader: 'Status' },
				{ id: 'name', track: 'minmax(12rem, 1fr)', header: 'Worktree' },
				{ id: 'path', track: 'minmax(0, 1fr)', header: 'Path' },
				{ id: 'actions', track: 'auto', srHeader: 'Actions' }
			]}
			narrow={{
				columns: 'auto minmax(0, 1fr) auto',
				cells: {
					status: { column: '1', row: '1' },
					name: { column: '2', row: '1' },
					actions: { column: '3', row: '1' },
					path: { hidden: true }
				}
			}}
		>
			{#snippet row(worktree, { cell })}
				<span {...cell('status', { class: statusCellClass })} data-testid="worktree-status">
					<Stamp size="sm" emphasis="ghost" border="none" background="transparent">
						{#if worktree.isMain()}
							<Icon icon={LucideHouse} width="14px" height="14px" />
						{:else if worktree.isLocked()}
							<Icon icon={LucideLock} width="14px" height="14px" />
						{:else}
							<Icon icon={LucideTrees} width="14px" height="14px" />
						{/if}
					</Stamp>
				</span>
				<div {...cell('name', { class: nameCellClass })} data-testid="worktree-row">
					<span class={lineClass}>
						<span class={nameClass} data-testid="worktree-name">{worktree.getName()}</span>
						{#if worktree.isMain()}
							<Badge size="sm" emphasis="secondary" data-testid="worktree-main-badge">main</Badge>
						{/if}
						{#if worktree.isLocked()}
							<Tooltip content={worktree.getLockReason() ?? 'Locked'}>
								{#snippet children(triggerProps)}
									<Badge
										{...triggerProps}
										size="sm"
										tone="warning"
										data-testid="worktree-locked-badge"
									>
										locked
									</Badge>
								{/snippet}
							</Tooltip>
						{/if}
						{#if worktree.isPrunable()}
							<Badge size="sm" tone="danger" data-testid="worktree-prunable-badge">missing</Badge>
						{/if}
					</span>
					<span class={lineClass}>
						<Stamp size="sm" emphasis="ghost" border="none" background="transparent">
							<Icon icon={LucideGitBranch} width="14px" height="14px" />
						</Stamp>
						<span class={branchClass} data-testid="worktree-branch">
							{worktree.getBranch() ?? 'detached'}
						</span>
						{#if worktree.getShortSha()}
							<Tooltip content={`Commit sha: ${worktree.getHeadSha()}`} wrap={false}>
								{#snippet children(triggerProps)}
									<span {...triggerProps} class={shaClass}>{worktree.getShortSha()}</span>
								{/snippet}
							</Tooltip>
						{/if}
					</span>
				</div>

				<!-- The tail of the path identifies the worktree, so the folder is
				     highlighted and pinned to the column's end on every row. -->
				<span {...cell('path')}>
					<TruncatedPath
						path={worktree.getPath()}
						highlight={worktree.getName()}
						align="end"
						class={pathClass}
						title={worktree.getPath()}
						data-testid="worktree-path"
					/>
				</span>

				<span {...cell('actions', { class: actionsCellClass })}>
					<!-- The main worktree has no lock to toggle. -->
					{#if !worktree.isMain()}
						<Tooltip
							content={worktree.isLocked() ? 'Unlock worktree' : 'Lock worktree'}
							placement="left"
						>
							{#snippet children(triggerProps)}
								<Button
									size="xs"
									shape="square"
									emphasis="ghost"
									tone={worktree.isLocked() ? 'warning' : undefined}
									disabled={busy}
									onclick={() => (worktree.isLocked() ? onUnlock(worktree) : onLock(worktree))}
									data-testid={worktree.isLocked() ? 'worktree-unlock' : 'worktree-lock'}
									{...triggerProps}
								>
									<Stamp emphasis="ghost" border="none" background="transparent">
										<Icon
											icon={worktree.isLocked() ? LucideLock : LucideLockOpen}
											width="14px"
											height="14px"
										/>
									</Stamp>
									<span class={visuallyHidden()}>
										{worktree.isLocked() ? 'Unlock' : 'Lock'}
									</span>
								</Button>
							{/snippet}
						</Tooltip>
					{/if}
				</span>
			{/snippet}
		</GridList>
	{/if}
</div>
