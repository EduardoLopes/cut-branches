<script lang="ts">
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Loading from '@pindoba/svelte-loading';
	import Navigation, {
		type NavigationItem,
		type NavigationTrailingAttachment
	} from '@pindoba/svelte-navigation';
	import Stamp from '@pindoba/svelte-stamp';
	import { createRawSnippet, mount, onDestroy, unmount, type Snippet } from 'svelte';
	import { foldText } from '../utils/fold-text';
	import { scrollShadow } from '../utils/scroll-shadow';
	import { page } from '$app/state';
	import { createGetRepositoryListQuery } from '$infrastructure/queries/create-get-repository-list-query';
	import { createPrefetchRepositoryData } from '$lib/create-prefetch-repository-data';
	import { repositorySort, sortRepositories } from '$lib/repository-sort.svelte';
	import { formatCount } from '$utils/format-count';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		headerAction?: Snippet<[]>;
		/**
		 * Collapses the list to a narrow rail: `'icon'` is icons-only (label as an
		 * auto tooltip); `'stack'` shows the icon above its label. `'none'` is the
		 * full-width list.
		 */
		compact?: 'none' | 'icon' | 'stack';
	}

	const { headerAction, compact = 'none' }: Props = $props();

	const isRail = $derived(compact !== 'none');

	// Rail badges are tucked INSIDE the item square. Navigation's default floats
	// the badge centered on the item's corner, which in a dense scrolling rail
	// means it lands on the row above and on the scroll box's scrollbar. Anchoring
	// inside keeps the whole badge within the item's own bounds — nothing
	// overhangs, so there's nothing to collide with.
	//
	// Because nothing overhangs, the badge doesn't need Navigation's default
	// `strategy: 'fixed'` (which exists to escape a clipping ancestor): keeping it
	// `absolute` means the scroll box clips a badge exactly like it clips its own
	// row, so a half-scrolled row can't float its badge over the list header.
	//
	// Typed as `NavigationTrailingAttachment` (i.e. Attachment's own config) so
	// every knob autocompletes: `anchor`/`placement`/`strategy` values, plus
	// `offset` (inward inset along the placement axes) vs `offsetX`/`offsetY`
	// (raw px nudges on the screen axes, applied last).
	const trailingAttachment = $derived<NavigationTrailingAttachment | undefined>(
		isRail
			? {
					anchor: 'inside',
					placement: 'top-end',
					offsetY: -2,
					// 0, not a nudge outward: any horizontal overhang has to be paid for
					// with matching padding on the scroll box (which clips at its padding
					// box), and that padding is rail width. Keep the badge inside.
					offsetX: 4,
					strategy: 'absolute'
				}
			: undefined
	);

	function makeBadgeSnippet(name: string, id: string, count: number): NavigationItem['trailing'] {
		return createRawSnippet(() => ({
			render: () => '<span style="display:contents"></span>',
			setup: (element) => {
				element.innerHTML = '';
				// Three digits verbatim, then "99+" — which is also three glyphs, so
				// the pill's width is bounded no matter the repo's branch count. A
				// four-digit number would grow it across the whole rail square. The
				// exact count is never lost: it stays on the badge's `aria-label`.
				const badgeText = formatCount(count, { max: 999, overflow: '99+' });
				const badgeLabel = createRawSnippet(() => ({
					render: () => `<span>${badgeText}</span>`
				}));
				const instance = mount(Badge, {
					target: element,
					props: {
						size: 'xs',
						emphasis: 'tertiary',
						children: badgeLabel,
						...(count > 0
							? { 'aria-label': `${count} ${count === 1 ? 'branch' : 'branches'}` }
							: {}),
						'data-testid': `repository-${name}-badge-${id}`
					}
				});
				return () => {
					unmount(instance);
				};
			}
		}));
	}

	// Query for repositories list from database
	const repositoriesQuery = createGetRepositoryListQuery();

	// Prefetch function for repository data on hover
	const prefetchRepositoryData = createPrefetchRepositoryData();

	// A pending hover prefetch outliving the list would fire against a torn-down
	// query scope (the sidebar unmounts with the rail on some routes).
	onDestroy(() => prefetchRepositoryData.cancel());

	// Map repository data to navigation items
	const items = $derived.by<NavigationItem[]>(() => {
		if (!repositoriesQuery.data) {
			return [];
		}

		// Ordering is a shared, persisted preference driven from the add-repository
		// menu (§1.5 cross-domain seam via `$lib`).
		const repositories = sortRepositories(repositoriesQuery.data, repositorySort.mode);
		return repositories.map((repo): NavigationItem => ({
			id: repo.id,
			label: repo.name,
			href: `/repos/${repo.id}`,
			'data-testid': `repository-${repo.name}-${repo.id}`,
			leading: repoIcon as NavigationItem['leading'],
			// In the rail the badge can't sit inline next to the icon, so Navigation
			// floats it over the item as an <Attachment> instead (see the rail's
			// `trailingAttachment` config below).
			trailing: makeBadgeSnippet(repo.name, repo.id, repo.branchesCount),
			// Warm everything `/repos/[id]` mounts, so navigation lands on cache.
			// `focus` matters as much as `mouseenter`: tabbing through the rail is
			// a real navigation path and used to prefetch nothing at all.
			onmouseenter: () => prefetchRepositoryData(repo.id, repo.path),
			onfocus: () => prefetchRepositoryData(repo.id, repo.path),
			// Intent is settled here, and `pointerdown` leads `click` by ~100ms —
			// free lead time, so skip the hover debounce entirely.
			onpointerdown: () => prefetchRepositoryData.now(repo.id, repo.path)
		})) satisfies NavigationItem[];
	});
</script>

{#snippet repoIcon()}
	<Stamp size="sm" shape="square" emphasis="ghost" background="transparent" border="none">
		<Icon icon="lucide:folder-git-2" />
	</Stamp>
{/snippet}

<!-- Recessed group panel: the repository list reads as one surface.deep
     region (header + scroll box). Content is inset on the left only; the
     right edge is flush so the scroll box's scrollbar (below) sits against
     the panel edge instead of floating with a gap. -->
<div
	class={css({
		flex: 1,
		minHeight: 0,
		display: 'flex',
		flexDirection: 'column',
		gap: '2xs',
		background: 'neutral.surface.soft',
		paddingBlock: '2xs',
		// Expanded: inset the content on the left, flush right so the scrollbar
		// hugs the panel edge. Rail: items are centered, so keep the horizontal
		// padding symmetric (0) — an offset left inset would push the centered
		// icons off the brand/footer center line.
		paddingLeft: 'xs',
		paddingRight: '0',
		'&[data-rail="true"]': {
			paddingInline: '0'
		},
		marginBottom: '2xs'
	})}
	data-rail={isRail}
>
	<div
		class={css({
			display: 'flex',
			alignItems: 'center',
			width: 'full',
			minHeight: '2rem',
			justifyContent: 'space-between',
			// Rail: `flex-end`, not `center` — expanded, the action already sits at
			// the row's end, so it keeps tracking the right edge as the width
			// animates instead of teleporting to the middle of a still-wide row.
			// At the final rail width the xs inset leaves ~one square of content,
			// so end-aligned lands on the items' column anyway.
			'&[data-rail="true"]': { justifyContent: 'flex-end', paddingInline: 'xs' }
		})}
		data-rail={isRail}
	>
		{#if !isRail}
			<!-- Folds out as the rail closes, and unfurls in step with the
			     sidebar reopening. -->
			<h2
				in:foldText={{ duration: 200 }}
				out:foldText={{ duration: 150 }}
				class={css({
					fontSize: 'xs',
					textTransform: 'uppercase',
					opacity: 0.6,
					color: 'neutral.text',
					margin: '0',
					// Sits on the rows' icon-glyph column: row border (0.1) + affix
					// pad (0.4) + the glyph's inset inside its 2.4rem affix box (~0.5).
					marginLeft: '1rem',
					alignSelf: 'flex-end',
					minWidth: 0,
					overflow: 'hidden',
					whiteSpace: 'nowrap'
				})}
			>
				Repositories
			</h2>
		{/if}
		<!-- Clears the panel's flush right edge so the action isn't jammed
		     against it; in the rail everything is center-aligned, so it would
		     only push the action off the items' center line. -->
		<div
			class={css({
				mr: 'sm',
				'&[data-rail="true"]': { mr: '0' }
			})}
			data-rail={isRail}
		>
			{#if headerAction}
				{@render headerAction()}
			{/if}
		</div>
	</div>
	<!-- Positioning context for the scroll-hint shadows. `overflow: hidden`
	     clips each overlay's outward box-shadow bleed to the list bounds. -->
	<div
		class={css({
			position: 'relative',
			flex: 1,
			minHeight: 0,
			display: 'flex',
			flexDirection: 'column',
			overflow: 'hidden'
		})}
	>
		<!--
			The scroll lives on this wrapper, NOT on <Loading>: Pindoba's Loading
			root is `display: contents`, so it generates no box and can't scroll or
			flex. This real div owns the bounded height + overflow instead.
		-->
		<div
			use:scrollShadow
			class={css({
				flex: 1,
				minHeight: 0,
				overflowY: 'auto',
				// The list only ever scrolls vertically. `overflow-y: auto` alone would
				// compute `overflow-x` to `auto` too, so anything a pixel wider than the
				// content box — the rail's reserved scrollbar gutters narrowing it below
				// the fixed-size item squares, a long label before it ellipsizes — adds a
				// horizontal scrollbar. Pinning it to `hidden` keeps one axis scrollable.
				overflowX: 'hidden',
				width: 'full',
				// Expanded: the panel insets the content on the left, so the matching
				// right inset lives here — rows keep breathing room from the panel edge
				// whether or not the list scrolls. macOS overlay scrollbars float over
				// this padding instead of adding to it, so there's no double gap once a
				// scrollbar appears.
				paddingLeft: '0',
				paddingRight: 'xs',
				'&[data-rail="true"]': {
					// The rail is a fixed 6.8rem: the 5.2rem item squares plus this
					// symmetric xs inset account for every px, so a scrollbar (classic
					// scrollbars, or `scrollbar-gutter` reserving for one) would come
					// straight out of the squares and clip them. Hide it in the rail —
					// wheel/trackpad scrolling still works and the scroll-hint shadows
					// below already signal clipped content. Symmetric padding keeps the
					// centred icon column on the brand/footer centre line.
					paddingLeft: 'xs',
					paddingRight: 'xs',
					scrollbarWidth: 'none',
					'&::-webkit-scrollbar': { display: 'none' }
				}
			})}
			data-rail={isRail}
		>
			<Loading
				loading={repositoriesQuery.isLoading}
				passThrough={{ root: { style: css.raw({ width: 'full', backdropFilter: 'none' }) } }}
			>
				{#if items.length > 0}
					<!-- Left-anchored on purpose, in the rail too: the scroll box's
					     symmetric xs padding leaves exactly one square of content width,
					     so hugging the left edge IS centered at the final rail width —
					     while `justify-content: center` would first shove the squares
					     toward the middle of the still-wide sidebar and drag them back
					     as the width animation catches up. -->
					<Navigation
						{items}
						activeItem={page.params.id}
						direction="vertical"
						border={isRail ? 'muted' : undefined}
						emphasis="tertiary"
						background="transparent"
						{compact}
						{trailingAttachment}
					/>
				{:else}
					<!-- In the rail this copy is wider than the rail itself (its
					     max-content width would pin the collapsed sidebar ~90px wider
					     than its items need), so it goes screen-reader-only there: the
					     empty state is still announced, it just stops driving layout. -->
					<p
						class={css({
							textAlign: 'center',
							padding: 'md',
							color: 'neutral.text.muted',
							opacity: 0.7,
							'&[data-rail="true"]': { srOnly: true }
						})}
						data-rail={isRail}
					>
						No repositories
					</p>
				{/if}
			</Loading>
		</div>
		<!-- Scroll hints: hidden by default, revealed only while the scroll box
		     reports clipped content in that direction (see scroll-shadow
		     action). `~` matches the overlays following the attributed scroll
		     box above. Each is a fade-to-surface gradient — clipped rows
		     visibly dissolve into the sidebar surface at the edge, which reads
		     as "more content this way" even with the scrollbar hidden (rail). -->
		<div
			aria-hidden="true"
			class={css({
				position: 'absolute',
				top: 0,
				insetInline: 0,
				height: '2.4rem',
				pointerEvents: 'none',
				zIndex: 1,
				opacity: 0,
				transition: 'opacity 120ms ease',
				background: 'linear-gradient(to bottom, token(colors.neutral.surface.soft), transparent)',
				'[data-overflow-top] ~ &': { opacity: 1 }
			})}
		></div>
		<div
			aria-hidden="true"
			class={css({
				position: 'absolute',
				bottom: 0,
				insetInline: 0,
				height: '2.4rem',
				pointerEvents: 'none',
				zIndex: 1,
				opacity: 0,
				transition: 'opacity 120ms ease',
				background: 'linear-gradient(to top, token(colors.neutral.surface.soft), transparent)',
				'[data-overflow-bottom] ~ &': { opacity: 1 }
			})}
		></div>
	</div>
</div>
