<script lang="ts">
	// Diff review view: the changed files of a branch (vs its merge-base with
	// HEAD) or a single commit (vs its parent), each row expandable into a
	// syntax-highlighted diff. First phase of the code-review surface — later
	// phases will grow file/function connection graphs on top of this list.
	import Icon from '@iconify/svelte';
	import Alert from '@pindoba/svelte-alert';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import { Choice, ChoiceItem } from '@pindoba/svelte-choice';
	import Input from '@pindoba/svelte-input';
	import Loading from '@pindoba/svelte-loading';
	import Stamp from '@pindoba/svelte-stamp';
	import { tick } from 'svelte';
	import { useDiffSearch } from '../application/use-diff-search.svelte';
	import { useDiffViewOptions } from '../application/use-diff-view-options.svelte';
	import { useReviewedFiles } from '../application/use-reviewed-files.svelte';
	import ChangedFileRow from '../components/changed-file-row.svelte';
	import DiffCanvas from '../components/diff-canvas.svelte';
	import DiffFileTree from '../components/diff-file-tree.svelte';
	import DiffOptionsMenu from '../components/diff-options-menu.svelte';
	import { createGetDiffStructureQuery } from '../infrastructure/queries/create-get-diff-structure-query';
	import { createListChangedFilesQuery } from '../infrastructure/queries/create-list-changed-files-query';
	import { buildStructureIndex } from '../models/structure-index';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { createGetRepositoryQuery } from '$domains/branch-management/infrastructure/queries/create-get-repository-query';
	import EmptyState from '$ui/core/empty-state.svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** Repository id from the route. */
		id: string;
		/** `?branch=<name>` target; null when absent. */
		branchName?: string | null;
		/** `?commit=<sha>` target; null when absent. */
		commitSha?: string | null;
	}

	let { id, branchName = null, commitSha = null }: Props = $props();

	const repositoryQuery = createGetRepositoryQuery(() => id, {
		enabled: () => !!id
	});
	const path = $derived(repositoryQuery.data?.path);

	const changedFilesQuery = createListChangedFilesQuery(() => ({
		path: path ?? '',
		branchName,
		commitSha
	}));

	// Code-structure analysis (changed symbols + import edges), shared by every
	// row (impact badges) and the canvas mode. Non-blocking: the list renders
	// without it and enriches when it lands.
	const structureQuery = createGetDiffStructureQuery(() => ({
		path: path ?? '',
		branchName,
		commitSha
	}));
	const structureIndex = $derived(buildStructureIndex(structureQuery.data));

	const shortSha = $derived(commitSha ? commitSha.slice(0, 7) : null);
	// Expand single-file diffs by default — the list adds nothing there.
	const autoExpand = $derived(changedFilesQuery.data?.files.length === 1);

	// How diffs are drawn (layout/style/gutter/wrap), persisted across sessions.
	const viewOptions = useDiffViewOptions();

	// The reviewer's per-file "reviewed" checklist, persisted per repo+target.
	// Shared by both surfaces: list rows and canvas nodes toggle the same set.
	const reviewed = useReviewedFiles({
		getPath: () => path ?? '',
		getBranchName: () => branchName,
		getCommitSha: () => commitSha,
		getFiles: () => changedFilesQuery.data?.files ?? []
	});
	// The count is over the full changeset regardless of search filtering, and
	// already excludes stale/removed marks (the composable only counts files
	// still present and unchanged).
	const reviewedCount = $derived(reviewed.count);

	// Search filters by file path immediately and by diff content (the code
	// in the hunks) once the per-file diffs load through the shared cache.
	let searchTerm = $state('');
	const search = useDiffSearch({
		getPath: () => path ?? '',
		getBranchName: () => branchName,
		getCommitSha: () => commitSha,
		getFiles: () => changedFilesQuery.data?.files ?? [],
		getTerm: () => searchTerm
	});
	const visibleFiles = $derived(
		(changedFilesQuery.data?.files ?? []).filter((file) => search.matches(file))
	);

	// --- File-tree navigation --------------------------------------------------
	// Activating a file in the tree scrolls its row into view and opens it.
	// `reveal` is a monotonic signal so re-activating the same file re-opens a
	// row the user collapsed in the meantime.
	let fileListElement = $state<HTMLElement | null>(null);
	let reveal = $state({ path: '', seq: 0 });

	function revealFile(file: { path: string }) {
		reveal = { path: file.path, seq: reveal.seq + 1 };
		fileListElement
			?.querySelector(`[data-file-path="${CSS.escape(file.path)}"]`)
			?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	// Activating a canvas node hands off to the list: switch mode, wait for
	// the rows to mount, then run the same reveal the file tree uses.
	async function openFileFromCanvas(path: string) {
		viewOptions.update({ viewMode: 'list' });
		await tick();
		revealFile({ path });
	}

	const host = css({
		display: 'flex',
		flexDirection: 'column',
		height: 'calc(100vh - 30px)',
		background: 'neutral.surface.step.1',
		color: 'neutral.text'
	});
	const header = css({
		display: 'flex',
		alignItems: 'center',
		gap: 'sm',
		px: 'md',
		py: 'sm',
		borderBottom: '1px solid token(colors.neutral.border.muted)',
		background: 'neutral.surface.step.1'
	});
	const title = css({ fontSize: 'md', fontWeight: 'bold' });
	const headerTrailing = css({
		display: 'flex',
		alignItems: 'center',
		gap: 'xs',
		ml: 'auto'
	});
	// Tree pane and file list scroll independently, side by side.
	const diffBody = css({
		display: 'flex',
		flex: '1',
		minHeight: 0
	});
	const treePane = css({
		width: '260px',
		flexShrink: '0',
		overflowY: 'auto',
		p: 'sm',
		borderRight: '1px solid token(colors.neutral.border.muted)'
	});
	const fileList = css({
		display: 'flex',
		flexDirection: 'column',
		gap: 'sm',
		p: 'md',
		overflowY: 'auto',
		// Wide diffs scroll inside their own hunk containers — never the page.
		overflowX: 'hidden',
		flex: '1',
		minWidth: 0
	});
	const fileListItem = css({ minWidth: '0', maxWidth: '100%' });
	const monoLabel = css({ fontFamily: 'mono' });
</script>

<div class={host}>
	<header class={header}>
		<Button
			emphasis="ghost"
			size="sm"
			onclick={() => goto(resolve(`/repos/${id}`))}
			data-testid="diff-back-button"
		>
			{#snippet leading()}
				<Stamp emphasis="ghost" border="muted" background="transparent">
					<Icon icon="lucide:arrow-left" width="16px" height="16px" />
				</Stamp>
			{/snippet}
			Branches
		</Button>
		<h1 class={title}>Changes</h1>
		{#if branchName}
			<Badge size="sm" emphasis="secondary" feedback="primary" data-testid="diff-target-branch">
				{#snippet leading()}
					<Stamp emphasis="ghost"><Icon icon="lucide:git-branch" /></Stamp>
				{/snippet}
				<span class={monoLabel} title={branchName}>{branchName}</span>
			</Badge>
		{:else if shortSha}
			<Badge size="sm" emphasis="secondary" feedback="primary" data-testid="diff-target-commit">
				{#snippet leading()}
					<Stamp emphasis="ghost"><Icon icon="lucide:git-commit-horizontal" /></Stamp>
				{/snippet}
				<span class={monoLabel} title={commitSha}>{shortSha}</span>
			</Badge>
		{/if}
		{#if changedFilesQuery.data && changedFilesQuery.data.files.length > 0}
			<div class={css({ width: '260px', flexShrink: '0', ml: 'sm' })}>
				<Input
					size="sm"
					placeholder="Search files and code…"
					aria-label="Search changed files and diff content"
					bind:value={searchTerm}
					data-testid="diff-search-input"
				/>
			</div>
			{#if search.isSearching}
				<span
					class={css({ fontSize: 'xs', color: 'neutral.text.muted' })}
					data-testid="diff-search-busy"
				>
					searching code…
				</span>
			{/if}
		{/if}
		{#if changedFilesQuery.data}
			{@const summary = changedFilesQuery.data}
			<span class={headerTrailing} data-testid="diff-totals">
				<span class={css({ fontSize: 'xs', color: 'neutral.text.muted' })}>
					{summary.files.length}
					{summary.files.length === 1 ? 'file' : 'files'}
				</span>
				<Badge size="sm" emphasis="secondary" feedback="success">+{summary.linesAdded}</Badge>
				<Badge size="sm" emphasis="secondary" feedback="danger">−{summary.linesRemoved}</Badge>
			</span>
			{#if summary.files.length > 0}
				<span
					class={css({ display: 'flex', alignItems: 'center', gap: '2xs' })}
					data-testid="diff-reviewed-progress"
				>
					<Badge
						size="sm"
						emphasis="secondary"
						feedback={reviewedCount === summary.files.length ? 'success' : 'neutral'}
						title="Files marked reviewed"
					>
						{#snippet leading()}
							<Stamp emphasis="ghost">
								<Icon
									icon={reviewedCount === summary.files.length
										? 'lucide:circle-check-big'
										: 'lucide:list-checks'}
								/>
							</Stamp>
						{/snippet}
						{reviewedCount}/{summary.files.length} reviewed
					</Badge>
					{#if reviewedCount > 0}
						<Button
							emphasis="ghost"
							size="xs"
							onclick={() => reviewed.clearReviewed()}
							aria-label="Clear all reviewed marks"
							title="Clear all reviewed marks"
							data-testid="diff-clear-reviewed"
						>
							Clear
						</Button>
					{/if}
				</span>
			{/if}
			{#if summary.files.length > 0}
				<!-- Keyed on the active mode so the Choice's internal selection can
				     never drift from the persisted option (same guard as the
				     repository context switch). -->
				{#key viewOptions.options.viewMode}
					<Choice
						type="radio"
						appearance="button"
						size="sm"
						defaultValue={[viewOptions.options.viewMode]}
						onValueChange={(value) => {
							const next = value[0];
							if (next === 'list' || next === 'canvas') {
								viewOptions.update({ viewMode: next });
							}
						}}
						aria-label="Diff view mode"
						data-testid="diff-view-mode-switch"
					>
						<ChoiceItem value="list" label="List" data-testid="view-mode-list">
							{#snippet leading()}
								<Stamp emphasis="ghost" border="none" background="transparent">
									<Icon icon="lucide:list" width="14px" height="14px" />
								</Stamp>
							{/snippet}
						</ChoiceItem>
						<ChoiceItem value="canvas" label="Canvas" data-testid="view-mode-canvas">
							{#snippet leading()}
								<Stamp emphasis="ghost" border="none" background="transparent">
									<Icon icon="lucide:workflow" width="14px" height="14px" />
								</Stamp>
							{/snippet}
						</ChoiceItem>
					</Choice>
				{/key}
				<DiffOptionsMenu options={viewOptions.options} onChange={viewOptions.update} />
			{/if}
		{/if}
	</header>

	{#if repositoryQuery.isError}
		<div class={css({ p: 'md' })}>
			<Alert feedback="danger" data-testid="diff-repository-error">
				{repositoryQuery.error.message}
			</Alert>
		</div>
	{:else if changedFilesQuery.isError}
		<div class={css({ p: 'md' })}>
			<Alert feedback="danger" data-testid="diff-error">
				{changedFilesQuery.error.description ?? changedFilesQuery.error.message}
			</Alert>
		</div>
	{:else if changedFilesQuery.isLoading || repositoryQuery.isLoading}
		<div class={css({ display: 'flex', justifyContent: 'center', p: 'lg' })}>
			<Loading loading data-testid="diff-loading">
				<span class={css({ color: 'neutral.text.muted' })}>Computing changes…</span>
			</Loading>
		</div>
	{:else if changedFilesQuery.data}
		{#if changedFilesQuery.data.files.length === 0}
			<EmptyState
				message="No changes to show — this {branchName
					? 'branch matches its merge-base with the current branch'
					: 'commit is empty'}."
				icon="lucide:file-diff"
				testId="diff-empty"
			/>
		{:else if visibleFiles.length === 0}
			<EmptyState
				message="No files or code match **{searchTerm}**."
				icon="lucide:search-x"
				testId="diff-search-empty"
			/>
		{:else if viewOptions.options.viewMode === 'canvas'}
			<!-- Canvas mode: the whole board depends on the structure analysis,
			     so its loading/error states live here. The list mode below never
			     blocks on that query. -->
			{#if structureQuery.isLoading}
				<div class={css({ display: 'flex', justifyContent: 'center', p: 'lg' })}>
					<Loading loading data-testid="canvas-structure-loading">
						<span class={css({ color: 'neutral.text.muted' })}>Analyzing code structure…</span>
					</Loading>
				</div>
			{:else if structureQuery.isError}
				<div class={css({ p: 'md' })}>
					<Alert feedback="danger" data-testid="canvas-structure-error">
						{structureQuery.error.description ?? structureQuery.error.message}
					</Alert>
				</div>
			{:else}
				<DiffCanvas
					files={visibleFiles}
					structure={structureQuery.data}
					repositoryPath={path ?? ''}
					{branchName}
					{commitSha}
					diffLayout={viewOptions.options.layout}
					diffVariant={viewOptions.options.variant}
					diffGutter={viewOptions.options.gutter}
					diffWrap={viewOptions.options.wrap}
					isReviewed={reviewed.isReviewed}
					onToggleReviewed={reviewed.toggle}
					onOpenFile={openFileFromCanvas}
				/>
			{/if}
		{:else}
			<div class={diffBody}>
				{#if visibleFiles.length > 1}
					<aside class={treePane} aria-label="Changed files tree" data-testid="diff-tree-pane">
						<DiffFileTree
							files={visibleFiles}
							selectedPath={reveal.path || null}
							onSelectFile={revealFile}
						/>
					</aside>
				{/if}
				<div
					class={fileList}
					role="list"
					data-testid="changed-files-list"
					bind:this={fileListElement}
				>
					{#each visibleFiles as file (file.path)}
						<div role="listitem" class={fileListItem} data-file-path={file.path}>
							<ChangedFileRow
								repositoryPath={path ?? ''}
								{branchName}
								{commitSha}
								{file}
								defaultExpanded={autoExpand}
								searchTerm={searchTerm.trim()}
								searchMatched={search.isContentMatch(file)}
								revealSeq={reveal.path === file.path ? reveal.seq : 0}
								structure={structureIndex.get(file.path)}
								layout={viewOptions.options.layout}
								variant={viewOptions.options.variant}
								gutter={viewOptions.options.gutter}
								wrap={viewOptions.options.wrap}
								reviewed={reviewed.isReviewed(file.path)}
								onToggleReviewed={reviewed.toggle}
							/>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
