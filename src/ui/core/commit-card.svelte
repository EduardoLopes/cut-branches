<script lang="ts">
	import Icon from '@iconify/svelte';
	import Card, { type PrimitiveCardFooterProps } from '@pindoba/svelte-card';
	import Markdown from 'svelte-exmarkdown';
	import { type Commit } from '$domains/branch-management/core/models/commit';
	import { safeFormatDate, safeFormatRelativeDate } from '$utils/date-utils';
	import { cleanEmailString } from '$utils/string-utils';
	import { css } from '@pindoba/styled-system/css';
	import { token } from '@pindoba/styled-system/tokens';

	interface Props {
		commit: Commit;
	}

	let { commit }: Props = $props();
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

<Card
	size="sm"
	background="surface.step.1"
	border="muted"
	shadow="none"
	radius="sm"
	footer={{
		leading: author as PrimitiveCardFooterProps['leading'],
		trailing: date as PrimitiveCardFooterProps['trailing']
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
