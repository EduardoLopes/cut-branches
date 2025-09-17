<script lang="ts">
	import Icon from '@iconify/svelte';
	import Markdown from 'svelte-exmarkdown';
	import type { Commit } from '$services/common';
	import { safeFormatDate, safeFormatRelativeDate } from '$utils/date-utils';
	import { cleanEmailString } from '$utils/string-utils';
	import { css } from '@pindoba/panda/css';

	interface Props {
		commit: Commit;
		deletedAt?: string;
	}

	let { commit, deletedAt }: Props = $props();
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
			color: 'neutral.950',
			pindobaTransition: 'fast',
			mb: 'xs'
		})}
		data-testid="last-commit-message"
	>
		<Markdown md={commit.message} />
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
				gap: 'xxs',
				pindobaTransition: 'fast',
				color: 'neutral.900'
			})}
			title={cleanEmailString(commit.email)}
			data-testid="author-name"
		>
			<Icon icon="lucide:circle-user-round" width="16px" height="16px" />
			{commit.author}
		</span>
		<span
			class={css({
				fontSize: 'sm',
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 'xxs',
				pindobaTransition: 'fast',
				color: 'neutral.900'
			})}
			title={safeFormatDate(commit.date)}
		>
			<Icon icon="lucide:clock" width="16px" height="16px" />{safeFormatRelativeDate(commit.date, {
				unit: 'day'
			})}
		</span>
		{#if deletedAt}
			<span
				class={css({
					fontSize: 'sm',
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					gap: 'xxs',
					color: 'danger.800',
					marginLeft: 'auto'
				})}
				title={safeFormatDate(deletedAt)}
			>
				<Icon icon="lucide:trash" width="16px" height="16px" />
				Deleted At {safeFormatRelativeDate(deletedAt)}
			</span>
		{/if}
	</div>
</div>
