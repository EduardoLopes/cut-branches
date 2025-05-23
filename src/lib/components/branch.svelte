<script lang="ts">
	import Icon from '@iconify/svelte';
	import Alert from '@pindoba/svelte-alert';
	import Group from '@pindoba/svelte-group';
	import Markdown from 'svelte-exmarkdown';
	import type { Branch } from '$lib/services/common';
	import { safeFormatDate, safeFormatRelativeDate } from '$lib/utils/date-utils';
	import { cleanEmailString, containsAnyWord, formatString } from '$lib/utils/string-utils';
	import { css } from '@pindoba/panda/css';

	interface Props {
		data: Branch;
		selected?: boolean;
		locked?: boolean;
		disabled?: boolean;
	}

	let { data, selected, locked, disabled }: Props = $props();

	const protectedWords = [
		'develop',
		'dev',
		'stg',
		'main',
		'staging',
		'master',
		'hml',
		'master',
		'default',
		'trunk'
	];

	const colorPalette = $derived.by(() => {
		if (selected) {
			return css({ colorPalette: 'danger' });
		}

		if (data.current) {
			return css({ colorPalette: 'primary' });
		}

		return css({ colorPalette: 'neutral' });
	});

	const alerts = $derived(
		Object.entries({
			fullyMerged: data.fullyMerged,
			protectedWords: containsAnyWord(data.name, protectedWords) && selected,
			offensiveWords: data.name.includes('master')
		})
			.filter((item) => item[1] === true)
			.map((item) => item[0])
	);
</script>

<div
	id={`branch-${data.name}-container`}
	class={[
		colorPalette,
		css({
			display: 'flex',
			flexDirection: 'column',
			borderRadius: 'md',
			borderWidth: '1px',
			borderColor: 'colorPalette.400',
			colorPalette: 'neutral',
			p: 'md',
			gap: 'md',
			_light: {
				background: 'neutral.50'
			},
			_dark: {
				background: 'neutral.100'
			},
			'&.disabled, &.locked': {
				opacity: 0.5,
				pointerEvents: 'none',
				filter: 'grayscale(1)'
			},
			'&.selected': {
				borderColor: 'danger.800',
				borderStyle: 'dashed',
				colorPalette: 'danger'
			},
			'&.current': {
				borderColor: 'primary.400',
				colorPalette: 'primary'
			},
			pindobaTransition: 'fast'
		})
	]}
	class:disabled
	class:locked
	class:current={data.current}
	class:selected
	title={data.current ? 'Current branch' : formatString('{name}', { name: data.name })}
	data-selected={selected}
	data-testid={`branch-item-${data.name}`}
>
	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			'.current &': {
				color: 'primary.800'
			},
			'.selected &': {
				borderColor: 'danger.800',
				color: 'danger.800'
			}
		})}
		id={`branch-${data.name}-title-container`}
	>
		<span
			class={css({
				fontWeight: 600,
				pindobaTransition: 'fast'
			})}
			data-testid="branch-name"
			id={`branch-${data.name}-name`}>{data.name}</span
		>
	</div>

	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			borderRadius: 'md'
		})}
		id={`branch-${data.name}-commit-container`}
	>
		<div
			class={css({
				fontSize: 'xs',
				textTransform: 'uppercase',
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 'xxs',
				pindobaTransition: 'fast',
				color: 'neutral.600',
				fontWeight: 'bold'
			})}
			id={`branch-${data.name}-commit-label`}
		>
			<Icon
				class={css({ color: 'neutral.800' })}
				icon="lucide:git-commit-horizontal"
				width="16px"
				height="16px"
				id={`branch-${data.name}-commit-icon`}
			/> Last commit
		</div>
		<span
			class={css({
				fontSize: 'sm',
				color: 'neutral.950',
				pindobaTransition: 'fast',
				mb: 'xs'
			})}
			data-testid="last-commit-message"
			id={`branch-${data.name}-commit-message`}
		>
			<Markdown md={data.lastCommit.message} />
		</span>

		<div
			class={css({
				display: 'flex',
				flexDirection: 'row',
				gap: 'sm'
			})}
			id={`branch-${data.name}-commit-details`}
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
				title={cleanEmailString(data.lastCommit.email)}
				data-testid="author-name"
				id={`branch-${data.name}-author`}
			>
				<Icon
					icon="lucide:circle-user-round"
					width="16px"
					height="16px"
					id={`branch-${data.name}-author-icon`}
				/>
				{data.lastCommit.author}
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
				title={safeFormatDate(data.lastCommit.date)}
				id={`branch-${data.name}-date`}
			>
				<Icon
					icon="lucide:clock"
					width="16px"
					height="16px"
					id={`branch-${data.name}-date-icon`}
				/>{safeFormatRelativeDate(data.lastCommit.date, { unit: 'day' })}
			</span>
			{#if data.deletedAt}
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
					title={safeFormatDate(data.deletedAt)}
					id={`branch-${data.name}-deleted-at`}
				>
					<Icon icon="lucide:trash" width="16px" height="16px" />
					Deleted At {safeFormatRelativeDate(data.deletedAt)}
				</span>
			{/if}
		</div>
	</div>

	{#if alerts.length > 0 && !(alerts.length === 1 && alerts[0] === 'fullyMerged' && data.current)}
		<Group direction="vertical" noBorder id={`branch-${data.name}-alerts-group`}>
			{#each alerts as alert (alert)}
				{#if alert === 'fullyMerged' && !data.current}
					<Alert id={`branch-${data.name}-alert-${alert}`}>
						<div class={css({ display: 'flex', gap: 'xs', alignItems: 'center' })}>
							<Icon icon="lucide:info" />
							<span>This branch is not fully merged into the current branch!</span>
						</div>
					</Alert>
				{:else if alert === 'protectedWords'}
					<Alert
						id={`branch-${data.name}-alert-${alert}`}
						data-testid="protected-words-alert"
						feedback="danger"
					>
						<div class={css({ display: 'flex', gap: 'xs', alignItems: 'center' })}>
							<Icon icon="lucide:alert-triangle" />
							<span
								>{formatString('This branch contains protected words ({name})', {
									name: data.name
								})}</span
							>
						</div>
					</Alert>
				{:else if alert === 'offensiveWords'}
					<Alert
						id={`branch-${data.name}-alert-${alert}`}
						data-testid="offensive-words-alert"
						feedback="warning"
					>
						<div class={css({ display: 'flex', gap: 'xs', alignItems: 'center' })}>
							<Icon icon="lucide:info" />
							<span
								>This branch contains potentially offensive words (e.g. 'master'). Consider renaming
								it to align with inclusive terminology.</span
							>
						</div>
					</Alert>
				{/if}
			{/each}
		</Group>
	{/if}
</div>
