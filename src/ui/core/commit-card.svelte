<script lang="ts">
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import Card, { type PrimitiveCardProps } from '@pindoba/svelte-card';
	import Popover from '@pindoba/svelte-popover';
	import Stamp from '@pindoba/svelte-stamp';
	import type { Snippet } from 'svelte';
	import Markdown from 'svelte-exmarkdown';
	import { type Commit } from '$domains/branch-management/core/models/commit';
	import { safeFormatDate, safeFormatRelativeDate } from '$utils/date-utils';
	import { cleanEmailString } from '$utils/string-utils';
	import { css } from '@pindoba/styled-system/css';
	import { token } from '@pindoba/styled-system/tokens';

	interface Props {
		commit: Commit;
		/** Semantic palette to follow — inherited from the enclosing branch card. */
		feedback?: PrimitiveCardProps['feedback'];
		/** Remote tracking ref this commit's branch follows (e.g. `origin/main`);
		 *  shown as a badge in the footer. Branch-level, so passed in by the
		 *  composing card rather than read from the commit. */
		upstream?: string | null;
		/** Optional deep-link into a history view for this commit; rendered as a
		 *  branch icon flanking the commit message. Kept generic: the URL is the
		 *  cross-domain channel, this component knows nothing about who serves it. */
		historyHref?: string;
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
		feedback = 'neutral',
		upstream,
		historyHref,
		hoverPreview,
		size = 'sm',
		background = 'surface.step.1',
		border = 'muted',
		shadow = 'none',
		radius = 'sm'
	}: Props = $props();

	// Anchor for the hover-preview popover: the branch icon link. Anchoring to
	// the icon (not the whole card) keeps the preview next to what the user is
	// hovering — the card spans the page, so a card-anchored popover would land
	// at the far edge, away from the icon.
	let previewTriggerEl = $state<HTMLElement | null>(null);

	// Whether this commit carries a description body worth disclosing.
	const hasBody = $derived(commit.getMessageBody().length > 0);
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
			color: 'neutral.text.muted',
			pindobaTransition: 'fast',
			_hover: { color: 'accent.text' }
		})}
		aria-label="View in commit history"
		title="View in commit history"
		data-testid="commit-history-link"
	>
		<Stamp emphasis="ghost" border="muted" size="sm" background="transparent">
			<Icon icon="lucide:git-branch" width="18px" height="18px" />
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
			display: 'inline-flex',
			alignItems: 'center',
			gap: '2xs',
			pindobaTransition: 'fast',
			wordBreak: 'break-word'
		})}
	>
		<span data-testid="last-commit-message">
			<Markdown md={commit.getSummary()} />
		</span>
		{#if hasBody}
			{@render bodyToggle()}
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
			fontSize: 'sm',
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			gap: '2xs',
			pindobaTransition: 'fast'
		})}
		title={cleanEmailString(commit.getEmail())}
		data-testid="author-name"
	>
		<Stamp size="xs" border="muted">
			<Icon
				icon="lucide:user-round"
				width="16px"
				height="16px"
				color={token('colors.neutral.text.muted')}
			/>
		</Stamp>
		{commit.getAuthor()}
	</span>
{/snippet}

{#snippet date()}
	<span
		class={css({
			fontSize: 'sm',
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			gap: '2xs',
			pindobaTransition: 'fast',
			color: 'neutral.text.muted'
		})}
		title={safeFormatDate(commit.getDate())}
		data-testid="commit-date"
	>
		<Stamp size="xs" border="muted">
			<Icon icon="lucide:clock" width="16px" height="16px" />
		</Stamp>
		{safeFormatRelativeDate(commit.getDate(), {
			unit: 'day'
		})}
	</span>
{/snippet}

<!-- Header meta line: author · relative date, sharing the trailing slot. -->
{#snippet meta()}
	<span
		class={css({
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			gap: 'xs',
			color: 'neutral.text.muted'
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
		<Badge size="sm" emphasis="secondary" {feedback} data-testid="commit-sha">
			<span
				class={css({
					display: 'inline-flex',
					alignItems: 'center',
					gap: '2xs',
					fontFamily: 'mono'
				})}
				title={commit.getSha()}
			>
				<Icon icon="lucide:git-commit-horizontal" width="12px" height="12px" />
				{commit.getShortSha()}
			</span>
		</Badge>
		{#if upstream}
			<Badge size="sm" emphasis="secondary" {feedback} data-testid="commit-upstream">
				<span
					class={css({ display: 'inline-flex', alignItems: 'center', gap: '2xs' })}
					title={upstream}
				>
					<Icon icon="lucide:git-branch" width="12px" height="12px" />
					{upstream}
				</span>
			</Badge>
		{/if}
	</span>
{/snippet}

<Card
	{size}
	{feedback}
	{background}
	{border}
	{shadow}
	{radius}
	header={{
		leading: historyHref ? branchLink : undefined,
		heading: { content: messageHeading, trailing: meta },
		headingTextStyle: 'heading.3xs',
		layout: {
			leading: {
				align: 'start'
			}
		},
		background: 'surface.soft'
		// Top-align the branch icon to the message block so it hugs the subject
		// line rather than floating to the vertical center of a multi-line body.
	}}
	children={hasBody && bodyExpanded ? messageBody : undefined}
	footer={{ children: footerMeta, background: 'surface.step.2' }}
/>

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
		openDelay={350}
		isModal={false}
		lockScroll={false}
		autoFocus={false}
	>
		{@render hoverPreview()}
	</Popover>
{/if}
