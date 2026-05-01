<script lang="ts">
	import Icon from '@iconify/svelte';
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

<div
	class={css({
		display: 'flex',
		flexDirection: 'column'
	})}
>
	<span
		class={css({
			fontSize: 'sm',
			pindobaTransition: 'fast',
			mb: 'xs'
		})}
		data-testid="last-commit-message"
	>
		<Markdown md={commit.getMessage()} />
	</span>

	<div
		class={css({
			display: 'flex',
			flexDirection: 'row',
			gap: 'sm'
		})}
	>
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
	</div>
</div>
