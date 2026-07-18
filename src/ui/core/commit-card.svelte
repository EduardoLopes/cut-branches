<script lang="ts">
	import Icon from '@iconify/svelte';
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
		/** Optional deep-link into a history view for this commit; rendered as a
		 *  branch icon flanking the commit message. Kept generic: the URL is the
		 *  cross-domain channel, this component knows nothing about who serves it. */
		historyHref?: string;
		/** Optional hover/focus preview content (e.g. a mini graph around this
		 *  commit), shown in a non-modal popover anchored to the branch icon.
		 *  Only rendered when `historyHref` is also provided (the icon is the
		 *  trigger). */
		hoverPreview?: Snippet;
	}

	let { commit, feedback = 'neutral', historyHref, hoverPreview }: Props = $props();

	// Anchor for the hover-preview popover: the branch icon link. Anchoring to
	// the icon (not the whole card) keeps the preview next to what the user is
	// hovering — the card spans the page, so a card-anchored popover would land
	// at the far edge, away from the icon.
	let previewTriggerEl = $state<HTMLElement | null>(null);
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

{#snippet messageHeading()}
	<span
		class={css({ pindobaTransition: 'fast', wordBreak: 'break-word' })}
		data-testid="last-commit-message"
	>
		<Markdown md={commit.getMessageFirstLine()} />
	</span>
{/snippet}

{#snippet messageBody()}
	<div class={css({ color: 'neutral.text.muted' })} data-testid="commit-description">
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

<!-- Footer meta line: author · relative date, sharing the trailing slot. -->
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

<Card
	size="sm"
	{feedback}
	background="surface.step.1"
	border="muted"
	shadow="none"
	radius="sm"
	header={{
		leading: historyHref ? branchLink : undefined,
		heading: { content: messageHeading, trailing: meta },
		headingTextStyle: 'heading.3xs',
		subheading: commit.getMessageBody() ? messageBody : undefined,
		subheadingTextStyle: 'caption'
		// Top-align the branch icon to the message block so it hugs the subject
		// line rather than floating to the vertical center of a multi-line body.
	}}
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
