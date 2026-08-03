<script lang="ts">
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import Card, {
		type PrimitiveCardFooterProps,
		type PrimitiveCardProps
	} from '@pindoba/svelte-card';
	import Popover from '@pindoba/svelte-popover';
	import Stamp from '@pindoba/svelte-stamp';
	import type { Snippet } from 'svelte';
	import Markdown from 'svelte-exmarkdown';
	import { type Commit } from '$domains/branch-management/core/models/commit';
	import {
		safeFormatDate,
		safeFormatRelativeDate,
		safeFormatRelativeDateShort
	} from '$utils/date-utils';
	import { cleanEmailString } from '$utils/string-utils';
	import { css } from '@pindoba/styled-system/css';
	import { token } from '@pindoba/styled-system/tokens';

	interface Props {
		commit: Commit;
		/** How much of the commit to show.
		 *
		 *  - `default` — the full card: header banner, markdown summary, author
		 *    and date with icons, a disclosable body, and a footer badge row.
		 *  - `compact` — the same card scaled down: one ellipsized title line
		 *    with inline author · date and a tight badge row. For long lists
		 *    (e.g. the commit-history graph) where the full card is too tall.
		 *  - `mini` — no card chrome at all: a single line of
		 *    summary · author · date. For places that embed a commit inside
		 *    another card (e.g. a branch card's last commit), where the header
		 *    and footer are pure weight. */
		density?: 'default' | 'compact' | 'mini';
		/** Extra badges appended after the SHA/upstream badges (e.g. tag or remote
		 *  ref decorations the generic card doesn't model). */
		footerBadges?: Snippet;
		/** Semantic palette to follow — inherited from the enclosing branch card. */
		feedback?: PrimitiveCardProps['feedback'];
		/** Remote tracking ref this commit's branch follows (e.g. `origin/main`);
		 *  shown as a badge in the footer. Branch-level, so passed in by the
		 *  composing card rather than read from the commit. */
		upstream?: string | null;
		/** Whether to render the upstream badge. Off by default: showing the
		 *  upstream is the branch card's job, so it opts in explicitly while
		 *  other contexts (e.g. commit-history rows) stay quiet. */
		showUpstream?: boolean;
		/** Optional deep-link into a history view for this commit; rendered as a
		 *  branch icon flanking the commit message. Kept generic: the URL is the
		 *  cross-domain channel, this component knows nothing about who serves it. */
		historyHref?: string;
		/** Optional deep-link into a diff view for this commit; rendered as a
		 *  file-diff icon pinned to the footer's right edge (the same spot the
		 *  branch card shows its diff button). Same contract as `historyHref`:
		 *  pre-resolved URL, no route knowledge. */
		diffHref?: string;
		/** Optional hover/focus preview content (e.g. a mini graph around this
		 *  commit), shown in a non-modal popover anchored to the branch icon.
		 *  Only rendered when `historyHref` is also provided (the icon is the
		 *  trigger). */
		hoverPreview?: Snippet;
		/** Card surface props, forwarded to the underlying pindoba Card so this
		 *  component can be reused on different backgrounds/contexts. Defaults
		 *  match the embedded "last commit" look inside a branch card. */
		size?: PrimitiveCardProps['size'];
		background?: PrimitiveCardProps['background'];
		border?: PrimitiveCardProps['border'];
		shadow?: PrimitiveCardProps['shadow'];
		radius?: PrimitiveCardProps['radius'];
	}

	let {
		commit,
		density = 'default',
		footerBadges,
		feedback = 'neutral',
		upstream,
		showUpstream = false,
		historyHref,
		diffHref,
		hoverPreview,
		size = 'sm',
		background = 'surface.hill',
		border = 'muted',
		shadow = 'none',
		radius = 'sm'
	}: Props = $props();

	// `mini` drops the card entirely; `compact` keeps it but scaled down. The
	// two share the single-line, ellipsized treatment of the summary, so most
	// of the layout below branches on `dense` rather than on the exact density.
	const isMini = $derived(density === 'mini');
	const dense = $derived(density !== 'default');

	// Compact density: a tighter Card size, a lighter heading style, smaller
	// meta/badge type, and a single-line ellipsized summary. Same content and
	// structure as the default card — only scaled down. `xs` is a native, tight
	// padding preset (no passThrough override needed).
	const cardSize = $derived<PrimitiveCardProps['size']>(dense ? 'xs' : size);
	const headingStyle = $derived(dense ? 'body.sm' : 'heading.3xs');
	const metaFont = $derived(dense ? 'xs' : 'sm');
	const badgeSize = $derived(dense ? 'xs' : 'sm');

	// Anchor for the hover-preview popover: the branch icon link. Anchoring to
	// the icon (not the whole card) keeps the preview next to what the user is
	// hovering — the card spans the page, so a card-anchored popover would land
	// at the far edge, away from the icon.
	let previewTriggerEl = $state<HTMLElement | null>(null);

	// The flanking icon links (history, diff) follow the card's density so
	// compact rows get compact controls.
	const linkStampSize = $derived(dense ? 'xs' : 'sm');
	const linkIconSize = $derived(dense ? '14px' : '18px');

	// How long the pointer must rest on the branch icon before the graph
	// preview opens. The mini row is the one place the icon is a standing
	// control rather than card decoration, so it answers faster — 350 ms there
	// reads as "nothing happened" and the preview goes unnoticed.
	const PREVIEW_OPEN_DELAY = $derived(isMini ? 150 : 350);

	// A native `title` rather than a Tooltip component: the same element is the
	// popover's hover trigger, and two hover-driven overlays on one target
	// fight each other. When a preview is attached, say so — otherwise the
	// icon looks like a plain link and nobody hovers long enough to find it.
	const historyLinkLabel = $derived(
		hoverPreview ? 'Commit graph — hover to preview, click to open' : 'View in commit history'
	);

	// Whether this commit carries a description body worth disclosing. The mini
	// row has nowhere to put it — its body belongs to whatever disclosure the
	// embedding card provides.
	const hasBody = $derived(!isMini && commit.getMessageBody().length > 0);
	// Per-card disclosure state for the body. Collapsed by default so lists stay
	// compact; the toggle in the header meta row reveals it.
	let bodyExpanded = $state(false);
</script>

<!-- Branch icon flanking the message on the left (the header Banner's `leading`
     slot). Doubles as the deep-link into the history view and the anchor/trigger
     for the hover preview. -->
{#snippet branchLink()}
	<!-- The href arrives pre-resolved from the composing domain (this generic
	     card must not know the app's route table). -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a
		bind:this={previewTriggerEl}
		href={historyHref}
		data-popover-trigger={hoverPreview ? true : undefined}
		class={css({
			display: 'flex',
			alignItems: 'center',
			// An icon has nothing to give: in the mini row it shares one flex line
			// with the summary, and the summary is what should absorb the squeeze.
			flexShrink: 0,
			color: 'neutral.text.muted',
			pindobaTransition: 'fast',
			_hover: { color: 'accent.text' }
		})}
		aria-label={historyLinkLabel}
		title={historyLinkLabel}
		data-testid="commit-history-link"
	>
		<Stamp emphasis="ghost" border="muted" size={linkStampSize} background="transparent">
			<Icon icon="lucide:git-branch" width={linkIconSize} height={linkIconSize} />
		</Stamp>
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{/snippet}

<!-- File-diff icon pinned to the footer's right edge — the same spot the
     branch card puts its diff button, so the control is always in the same
     place. Deep-links into a diff view of this commit; same pre-resolved-URL
     contract as the history link. -->
{#snippet diffLink()}
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a
		href={diffHref}
		class={css({
			display: 'flex',
			alignItems: 'center',
			color: 'neutral.text.muted',
			pindobaTransition: 'fast',
			_hover: { color: 'accent.text' }
		})}
		aria-label="View commit diff"
		title="View commit diff"
		data-testid="commit-diff-link"
	>
		<Stamp emphasis="ghost" border="muted" size={linkStampSize} background="transparent">
			<Icon icon="lucide:file-diff" width={linkIconSize} height={linkIconSize} />
		</Stamp>
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{/snippet}

<!-- Disclosure toggle for the description body, sitting beside the commit
     summary. Lives in the always-visible heading (not inside the collapsible
     body) and only renders when the commit actually has a body. -->
{#snippet bodyToggle()}
	<Button
		emphasis="ghost"
		size="xs"
		shape="square"
		onclick={() => (bodyExpanded = !bodyExpanded)}
		aria-expanded={bodyExpanded}
		aria-label={bodyExpanded ? 'Hide commit description' : 'Show commit description'}
		title={bodyExpanded ? 'Hide description' : 'Show description'}
		data-testid="toggle-commit-description"
	>
		<span
			class={css({
				display: 'inline-flex',
				pindobaTransition: 'fast',
				transform: bodyExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
			})}
		>
			<Stamp emphasis="ghost" border="none" background="transparent">
				<Icon icon="lucide:chevron-down" width="16px" height="16px" />
			</Stamp>
		</span>
	</Button>
{/snippet}

{#snippet messageHeading()}
	<span
		class={css({
			display: dense ? 'flex' : 'inline-flex',
			alignItems: 'center',
			gap: '2xs',
			minWidth: '0',
			width: dense ? '100%' : undefined,
			pindobaTransition: 'fast',
			wordBreak: dense ? 'normal' : 'break-word'
		})}
	>
		{#if dense}
			<!-- Single-line, ellipsized subject: keeps every row the same height.
			     Plain text (not Markdown) so the truncation is a clean one-liner
			     rather than a wrapping <p> block. It flexes so it — not the meta —
			     absorbs the overflow. -->
			<span
				data-testid="last-commit-message"
				title={commit.getSummary()}
				class={css({
					flex: '1',
					minWidth: '0',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
					fontWeight: 'medium'
				})}
			>
				{commit.getSummary()}
			</span>
		{:else}
			<span data-testid="last-commit-message">
				<Markdown md={commit.getSummary()} />
			</span>
		{/if}
		{#if hasBody}
			<span class={css({ flexShrink: '0' })}>
				{@render bodyToggle()}
			</span>
		{/if}
	</span>
{/snippet}

{#snippet messageBody()}
	<div
		class={css({
			color: 'neutral.text.muted',
			maxWidth: '90ch',
			textWrap: 'pretty',
			fontSize: 'sm'
		})}
		data-testid="commit-description"
	>
		<Markdown md={commit.getMessageBody()} />
	</div>
{/snippet}

{#snippet author()}
	<span
		class={css({
			fontSize: metaFont,
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			gap: '2xs',
			pindobaTransition: 'fast',
			// In compact rows the meta must not wrap or steal width from the
			// summary — it stays one line and the summary truncates instead.
			whiteSpace: dense ? 'nowrap' : undefined,
			flexShrink: dense ? 0 : undefined
		})}
		title={cleanEmailString(commit.getEmail())}
		data-testid="author-name"
	>
		{#if !dense}
			<Stamp size="xs" border="muted">
				<Icon
					icon="lucide:user-round"
					width="16px"
					height="16px"
					color={token('colors.neutral.text.muted')}
				/>
			</Stamp>
		{/if}
		{commit.getAuthor()}
	</span>
{/snippet}

{#snippet date()}
	<span
		class={css({
			fontSize: metaFont,
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			gap: '2xs',
			pindobaTransition: 'fast',
			color: 'neutral.text.muted',
			whiteSpace: dense ? 'nowrap' : undefined,
			flexShrink: dense ? 0 : undefined
		})}
		title={safeFormatDate(commit.getDate())}
		data-testid="commit-date"
	>
		{#if !dense}
			<Stamp size="xs" border="muted">
				<Icon icon="lucide:clock" width="16px" height="16px" />
			</Stamp>
		{/if}
		{#if dense}
			{safeFormatRelativeDateShort(commit.getDate())}
		{:else}
			{safeFormatRelativeDate(commit.getDate(), { unit: 'day' })}
		{/if}
	</span>
{/snippet}

<!-- Header meta line: author · relative date, sharing the trailing slot. -->
{#snippet meta()}
	<span
		class={css({
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			gap: dense ? '2xs' : 'xs',
			color: 'neutral.text.muted',
			whiteSpace: dense ? 'nowrap' : undefined,
			flexShrink: dense ? 0 : undefined
		})}
	>
		{@render author()}
		<span class={css({ color: 'neutral.text.muted' })} aria-hidden="true">·</span>
		{@render date()}
	</span>
{/snippet}

<!-- Dedicated footer row: short SHA (always) and the upstream ref (when set),
     as badges. Both carry the full value in `title` for hover disclosure. -->
{#snippet footerMeta()}
	<span
		class={css({
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			gap: 'xs',
			flexWrap: 'wrap'
		})}
	>
		<Badge size={badgeSize} emphasis="secondary" {feedback} data-testid="commit-sha">
			{#snippet leading()}
				<Stamp emphasis="ghost"><Icon icon="lucide:git-commit-horizontal" /></Stamp>
			{/snippet}
			<span class={css({ fontFamily: 'mono' })} title={commit.getSha()}>
				{commit.getShortSha()}
			</span>
		</Badge>
		{#if showUpstream && upstream}
			<Badge size={badgeSize} emphasis="secondary" {feedback} data-testid="commit-upstream">
				{#snippet leading()}
					<Stamp emphasis="ghost"><Icon icon="lucide:git-branch" /></Stamp>
				{/snippet}
				<span title={upstream}>
					{upstream}
				</span>
			</Badge>
		{/if}
		{@render footerBadges?.()}
	</span>
{/snippet}

{#if isMini}
	<!-- No Card: the header banner and footer badge row are exactly the weight
	     this density exists to remove. One line, one height, nothing else. The
	     history link stays — it is the popover's anchor and the only control
	     left, so it reads as the row's affordance rather than as decoration. -->
	<div
		class={css({
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			gap: '2xs',
			width: '100%',
			minWidth: '0'
		})}
		data-testid="commit-mini-row"
	>
		{#if historyHref}
			{@render branchLink()}
		{/if}
		{@render messageHeading()}
		{@render meta()}
	</div>
{:else}
	<Card
		class={css({ width: '100%', minWidth: '0' })}
		size={cardSize}
		{feedback}
		{background}
		{border}
		{shadow}
		{radius}
		header={{
			leading: historyHref ? branchLink : undefined,
			heading: { content: messageHeading, trailing: meta },
			headingTextStyle: headingStyle,
			layout: {
				leading: {
					align: 'start'
				},
				// In compact mode the summary is a single ellipsized line, so pin the
				// author · date meta to the trailing edge.
				...(dense ? { heading: { trailing: 'apart' } } : {})
			},
			// Let the summary shrink so its ellipsis engages. The Banner nests the
			// heading through several flank/group wrappers; EVERY one needs
			// `min-width: 0` (a flex item won't shrink below content size otherwise),
			// the content must `flex: 1`, and the trailing meta must not shrink.
			passThrough: dense
				? {
						root: { style: css.raw({ width: '100%', minWidth: '0' }) },
						flankRow: { style: css.raw({ width: '100%', minWidth: '0' }) },
						flankGroup: { style: css.raw({ width: '100%', minWidth: '0' }) },
						headingGroup: { style: css.raw({ width: '100%', minWidth: '0' }) },
						headingContainer: { style: css.raw({ width: '100%', minWidth: '0' }) },
						heading: { style: css.raw({ flex: '1', minWidth: '0', overflow: 'hidden' }) },
						headingTrailing: { style: css.raw({ flexShrink: '0' }) }
					}
				: undefined,
			background: 'surface.peak'
			// Top-align the branch icon to the message block so it hugs the subject
			// line rather than floating to the vertical center of a multi-line body.
		}}
		children={hasBody && bodyExpanded ? messageBody : undefined}
		footer={{
			children: footerMeta,
			// The diff button lives in the footer's trailing slot so it hugs the
			// right edge — same position as on the branch card.
			...(diffHref ? { trailing: diffLink as PrimitiveCardFooterProps['trailing'] } : {}),
			background: 'surface.base',
			passThrough: {
				trailing: { style: css.raw({ flexShrink: '0' }) }
			}
		}}
	/>
{/if}

{#if hoverPreview && historyHref}
	<!-- Preview floats in a non-modal popover anchored to the branch icon;
	     hover opens it after a short delay so casual mouse travel doesn't
	     flash previews. Hover-only on purpose: the icon is a link — focusing
	     it (tab or click) shouldn't pop the preview, and keyboard users reach
	     the same graph by following the link. -->
	<Popover
		triggerElement={previewTriggerEl}
		triggerStrategy="hover"
		placement="left-start"
		openDelay={PREVIEW_OPEN_DELAY}
		isModal={false}
		lockScroll={false}
		autoFocus={false}
	>
		{@render hoverPreview()}
	</Popover>
{/if}
