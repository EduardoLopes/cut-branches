<script lang="ts">
	// A compact slice of the commit graph around one commit — the hover
	// preview attached to commit cards. Fetches a small backend window
	// centred on the sha (served from the cached history session) and renders
	// it through the SAME graph model + rail renderer as the full view, at
	// reduced geometry. No second graph renderer.
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Stamp from '@pindoba/svelte-stamp';
	import { useQueryClient } from '@tanstack/svelte-query';
	import GraphRailCell from './graph-rail-cell.svelte';
	import { goto } from '$app/navigation';
	import {
		fetchCommitHistoryWindow,
		PREVIEW_WINDOW
	} from '$domains/branch-management/features/commit-history/infrastructure/queries/create-get-commit-history-window-query';
	import {
		computeGraph,
		type Graph
	} from '$domains/branch-management/features/commit-history/models/commit-graph';
	import type { AppError } from '$infrastructure/bindings';
	import { resolveRepositorySubPath } from '$lib/repository-route';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		repoId: string;
		path: string;
		/** The commit the preview centres on. */
		sha: string;
	}

	let { repoId, path, sha }: Props = $props();

	const queryClient = useQueryClient();

	// The path is resolve()d; only the ?commit query is appended, which the
	// rule's static analysis can't see through.
	// eslint-disable-next-line svelte/no-navigation-without-resolve
	const openFullHistory = () =>
		goto(`${resolveRepositorySubPath(repoId, 'history')}?commit=${sha}`);

	// Preview geometry: small rows, tight lanes.
	const ROW_H = 22;
	const CELL = 12;
	// Cap on the rail viewport; graphs with fewer lanes shrink the rail to
	// their real width so no dead space opens up before the commit text.
	const RAIL_MAX_W = 120;

	let graph = $state<Graph | null>(null);
	let targetOffset = $state(-1);
	let error = $state<AppError | null>(null);

	// The preview highlights only the hovered branch: the lane its tip commit
	// occupies. Other local lines render muted so the hovered line stands out.
	const highlightLane = $derived(graph?.rows[targetOffset]?.commitLane);

	// Rail viewport sized to the lanes actually used (capped).
	const railW = $derived(graph ? Math.min((graph.laneCount + 1) * CELL, RAIL_MAX_W) : RAIL_MAX_W);

	$effect(() => {
		let cancelled = false;
		graph = null;
		error = null;
		fetchCommitHistoryWindow(queryClient, {
			repoId,
			path,
			targetSha: sha,
			...PREVIEW_WINDOW
		})
			.then((window) => {
				if (cancelled) return;
				graph = computeGraph(window.commits);
				targetOffset = window.targetIndex - window.startIndex;
			})
			.catch((e) => {
				if (!cancelled) error = e as AppError;
			});
		return () => {
			cancelled = true;
		};
	});

	const host = css({
		display: 'flex',
		flexDirection: 'column',
		minWidth: '320px',
		maxWidth: '420px',
		fontSize: 'xs'
	});
	const row = css({
		display: 'flex',
		alignItems: 'center',
		gap: 'xs',
		overflow: 'hidden'
	});
	const rowTarget = css({
		background: 'accent.surface.peak',
		borderRadius: 'sm'
	});
	const shaCode = css({
		fontFamily: 'mono',
		color: 'neutral.text.muted',
		flex: '0 0 auto'
	});
	const message = css({
		flex: '1',
		minWidth: '0',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		color: 'neutral.text'
	});
	const stateText = css({ p: 'sm', color: 'neutral.text.muted' });
	const footer = css({
		mt: 'xs',
		display: 'flex',
		justifyContent: 'flex-end'
	});
</script>

<div class={host} data-testid="commit-graph-preview">
	{#if error}
		<span class={stateText}>{error.message}</span>
	{:else if !graph}
		<span class={stateText}>Loading history…</span>
	{:else}
		{#each graph.rows as graphRow, i (graphRow.commit.sha)}
			<div class={`${row} ${i === targetOffset ? rowTarget : ''}`}>
				<GraphRailCell
					row={graphRow}
					laneCount={graph.laneCount}
					size={ROW_H}
					cell={CELL}
					{railW}
					{highlightLane}
				/>
				<code class={shaCode}>{graphRow.commit.shortSha}</code>
				<span class={message} title={graphRow.commit.message}>{graphRow.commit.message}</span>
			</div>
		{/each}
		<div class={footer}>
			<Button emphasis="secondary" onclick={openFullHistory} data-testid="open-full-history">
				Open full history
				{#snippet trailing()}
					<Stamp emphasis="ghost" border="none" background="transparent">
						<Icon icon="lucide:chevron-right" width="14px" height="14px" />
					</Stamp>
				{/snippet}
			</Button>
		</div>
	{/if}
</div>
