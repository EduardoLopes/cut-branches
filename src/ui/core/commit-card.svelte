<script lang="ts">
	import Icon from '@iconify/svelte';
	import Card, {
		type PrimitiveCardFooterProps,
		type PrimitiveCardProps
	} from '@pindoba/svelte-card';
	import Popover from '@pindoba/svelte-popover';
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
		 *  small footer icon-link. Kept generic: the URL is the cross-domain
		 *  channel, this component knows nothing about who serves it. */
		historyHref?: string;
		/** Optional hover/focus preview content (e.g. a mini graph around this
		 *  commit), shown in a non-modal popover anchored to the history icon.
		 *  Only rendered when `historyHref` is also provided (the icon is the
		 *  trigger). */
		hoverPreview?: Snippet;
	}

	let { commit, feedback = 'neutral', historyHref, hoverPreview }: Props = $props();

	// Anchor for the hover-preview popover: the history icon link. Anchoring to
	// the icon (not the whole card) keeps the preview next to what the user is
	// hovering — the card spans the page, so a card-anchored popover would land
	// at the far edge, away from the icon.
	let previewTriggerEl = $state<HTMLElement | null>(null);
</script>

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
		<Icon
			icon="lucide:circle-user-round"
			width="16px"
			height="16px"
			color={token('colors.neutral.text.muted')}
		/>
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
		<Icon icon="lucide:clock" width="16px" height="16px" />{safeFormatRelativeDate(
			commit.getDate(),
			{
				unit: 'day'
			}
		)}
	</span>
{/snippet}

{#snippet trailing()}
	{@render date()}
	{#if historyHref}
		<!-- The href arrives pre-resolved from the composing domain (this
		     generic card must not know the app's route table). -->
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a
			bind:this={previewTriggerEl}
			href={historyHref}
			data-popover-trigger={hoverPreview ? true : undefined}
			class={css({
				display: 'flex',
				alignItems: 'center',
				color: 'neutral.text.muted',
				_hover: { color: 'accent.text' }
			})}
			aria-label="View in commit history"
			title="View in commit history"
			data-testid="commit-history-link"
		>
			<Icon icon="lucide:git-commit-horizontal" width="16px" height="16px" />
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	{/if}
{/snippet}

{#snippet card()}
	<Card
		size="sm"
		{feedback}
		background="surface.step.1"
		border="muted"
		shadow="none"
		radius="sm"
		footer={{
			leading: author as PrimitiveCardFooterProps['leading'],
			trailing: trailing as PrimitiveCardFooterProps['trailing']
		}}
	>
		<div
			class={css({
				display: 'flex',
				flexDirection: 'column',
				gap: '2xs'
			})}
		>
			<span
				class={css({
					fontSize: 'sm',
					pindobaTransition: 'fast'
				})}
				data-testid="last-commit-message"
			>
				<Markdown md={commit.getMessageFirstLine()} />
			</span>

			{#if commit.getMessageBody()}
				<div
					class={css({
						fontSize: 'xs',
						color: 'neutral.text.muted'
					})}
					data-testid="commit-description"
				>
					<Markdown md={commit.getMessageBody()} />
				</div>
			{/if}
		</div>
	</Card>
{/snippet}

{@render card()}

{#if hoverPreview && historyHref}
	<!-- Preview floats in a non-modal popover anchored to the history icon;
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
