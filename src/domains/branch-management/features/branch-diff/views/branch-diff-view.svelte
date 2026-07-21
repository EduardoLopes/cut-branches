<script lang="ts">
	// Diff review view: the changed files of a branch (vs its merge-base with
	// HEAD) or a single commit (vs its parent), each row expandable into a
	// syntax-highlighted diff. First phase of the code-review surface — later
	// phases will grow file/function connection graphs on top of this list.
	import Icon from '@iconify/svelte';
	import Alert from '@pindoba/svelte-alert';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import Input from '@pindoba/svelte-input';
	import Loading from '@pindoba/svelte-loading';
	import Stamp from '@pindoba/svelte-stamp';
	import { useDiffSearch } from '../application/use-diff-search.svelte';
	import { useDiffViewOptions } from '../application/use-diff-view-options.svelte';
	import ChangedFileRow from '../components/changed-file-row.svelte';
	import DiffFileTree from '../components/diff-file-tree.svelte';
	import DiffOptionsMenu from '../components/diff-options-menu.svelte';
	import { createListChangedFilesQuery } from '../infrastructure/queries/create-list-changed-files-query';
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

	const shortSha = $derived(commitSha ? commitSha.slice(0, 7) : null);
	// Expand single-file diffs by default — the list adds nothing there.
	const autoExpand = $derived(changedFilesQuery.data?.files.length === 1);

	// How diffs are drawn (layout/style/gutter/wrap), persisted across sessions.
	const viewOptions = useDiffViewOptions();

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
								layout={viewOptions.options.layout}
								variant={viewOptions.options.variant}
								gutter={viewOptions.options.gutter}
								wrap={viewOptions.options.wrap}
							/>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
