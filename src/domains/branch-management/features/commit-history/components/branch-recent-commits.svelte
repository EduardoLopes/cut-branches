<script lang="ts">
	// The branch card's "More" panel: the commits *before* the tip on one
	// branch, in the commit card's compact density — SHA badge, disclosable
	// description, diff link.
	//
	// The tip itself is deliberately excluded: the mini row directly above
	// already shows it, and repeating it here reads as a duplicate rather than
	// as history. The panel starts where that row leaves off.
	//
	// The component is mounted only while the disclosure is open (branch-card
	// renders the snippet conditionally), so the query below runs on first
	// expand rather than on page load.
	import Icon from '@iconify/svelte';
	import Alert from '@pindoba/svelte-alert';
	import Stamp from '@pindoba/svelte-stamp';
	import { resolve } from '$app/paths';
	import {
		BRANCH_COMMITS_PAGE_SIZE,
		createListBranchCommitsQuery
	} from '$domains/branch-management/features/commit-history/infrastructure/queries/create-list-branch-commits-query';
	import { toCommit } from '$domains/branch-management/features/commit-history/models/to-commit';
	import { isFeatureEnabled } from '$lib/feature-flags.svelte';
	import CommitCard from '$ui/core/commit-card.svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		repoId: string;
		path: string;
		branch: string;
	}

	let { repoId, path, branch }: Props = $props();

	const query = createListBranchCommitsQuery(() => ({ repoId, path, branch }));

	const commits = $derived(query.data?.commits.map(toCommit) ?? []);
	// Drop the tip: the branch card's mini row is already showing it.
	const earlierCommits = $derived(commits.slice(1));
	const hasMore = $derived(query.data?.hasMore ?? false);

	// Per-commit diff deep-links, gated by their own flag (the same contract the
	// history rows use). Pre-resolved here so the generic card stays route-blind.
	const diffEnabled = $derived(isFeatureEnabled('branch-diff'));
	const diffHrefFor = (sha: string) =>
		diffEnabled ? `${resolve(`/repos/${repoId}/diff`)}?commit=${sha}` : undefined;

	// The history view deep-links by commit, not by branch, so aim it at this
	// branch's tip — that lands the scroll on the same row the panel starts at.
	const historyHref = $derived(
		commits.length
			? `${resolve(`/repos/${repoId}/history`)}?commit=${commits[0].getSha()}`
			: resolve(`/repos/${repoId}/history`)
	);

	const list = css({ display: 'flex', flexDirection: 'column', gap: 'xs' });
	const stateText = css({ fontSize: 'xs', color: 'neutral.text.muted', paddingY: '2xs' });
	const footer = css({
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 'xs',
		fontSize: 'xs',
		color: 'neutral.text.muted',
		paddingTop: '2xs'
	});
	const moreLink = css({
		display: 'inline-flex',
		alignItems: 'center',
		gap: '2xs',
		color: 'accent.text',
		pindobaTransition: 'fast',
		_hover: { textDecoration: 'underline' }
	});
</script>

<div data-testid="branch-recent-commits">
	{#if query.isPending}
		<span class={stateText} data-testid="recent-commits-loading">Loading commits…</span>
	{:else if query.isError}
		<Alert feedback="danger" emphasis="secondary" data-testid="recent-commits-error">
			{query.error.message}
		</Alert>
	{:else if earlierCommits.length === 0}
		<span class={stateText} data-testid="recent-commits-empty">
			Nothing before this commit on the branch.
		</span>
	{:else}
		<div class={list}>
			{#each earlierCommits as commit, index (commit.getSha())}
				<!-- Staggered entrance: rows resolve top-down instead of the whole
				     block popping in at once, which reads as one object rather than a
				     list. `fadeInUp` is the shared keyframe from panda.config.ts; the
				     per-row delay rides an inline custom property so Panda still
				     generates a single static class. -->
				<div
					style={`--i: ${index}`}
					class={css({
						animation: 'fadeInUp 220ms cubic-bezier(0.2, 0, 0, 1) both',
						animationDelay: 'calc(var(--i) * 30ms)',
						_motionReduce: { animation: 'none' }
					})}
				>
					<CommitCard
						{commit}
						density="compact"
						radius="inner"
						diffHref={diffHrefFor(commit.getSha())}
					/>
				</div>
			{/each}
		</div>
	{/if}

	{#if hasMore}
		<div class={footer}>
			<span>Showing the {BRANCH_COMMITS_PAGE_SIZE - 1} commits before the tip.</span>
			<!-- The path is resolve()d; only the ?commit query is appended, which
			     the rule's static analysis can't see through. -->
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
			<a href={historyHref} class={moreLink} data-testid="recent-commits-open-history">
				Full history
				<Stamp emphasis="ghost" border="none" background="transparent">
					<Icon icon="lucide:chevron-right" width="14px" height="14px" />
				</Stamp>
			</a>
		</div>
	{/if}
</div>
