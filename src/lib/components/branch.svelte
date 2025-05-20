<script lang="ts">
	import Icon from '@iconify/svelte';
	import Alert from '@pindoba/svelte-alert';
	import Group from '@pindoba/svelte-group';
	import { intlFormatDistance } from 'date-fns';
	import type { Branch } from '$lib/stores/repository.svelte';
	import { formatDate } from '$lib/utils/format-date';
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
			protectedWords: protectedWords.some((item) => data.name.includes(item)) && selected,
			offensiveWords: data.name.includes('master')
		})
			.filter((item) => item[1] === true)
			.map((item) => item[0])
	);

	// Safe date formatting function to handle invalid dates
	function safeFormatDate(dateStr: string): string {
		try {
			// Check if the date is valid
			const date = new Date(dateStr);
			if (isNaN(date.getTime())) {
				throw new Error('Invalid date');
			}
			return formatDate(date);
		} catch {
			return 'Unknown date';
		}
	}

	// Safe relative date formatting function
	function safeFormatRelativeDate(dateStr: string): string {
		try {
			// Check if the date is valid
			const date = new Date(dateStr);
			if (isNaN(date.getTime())) {
				throw new Error('Invalid date');
			}
			return intlFormatDistance(date, Date.now(), { unit: 'day' });
		} catch {
			return 'Unknown';
		}
	}
</script>

<div class={colorPalette} id={`branch-${data.name}-container`}>
	<div
		class={css({
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
		})}
		class:disabled
		class:locked
		class:current={data.current}
		class:selected
		title={`${data.current ? 'Current branch ' : ''}`}
		data-selected={selected}
		data-testid={`branch-item-${data.name}`}
		id={`branch-${data.name}-card`}
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
				{data.lastCommit.message}
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
					title={data.lastCommit.email.replace(/^<|>$/g, '')}
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
					/>{safeFormatRelativeDate(data.lastCommit.date)}
				</span>
			</div>
		</div>

		{#if alerts.length > 0 && !(alerts.length === 1 && alerts[0] === 'fullyMerged' && data.current)}
			<Group direction="vertical" noBorder id={`branch-${data.name}-alerts-group`}>
				{#each alerts as alert (alert)}
					{#if alert === 'fullyMerged' && !data.current}
						<Alert id={`branch-${data.name}-alert-${alert}`}
							>This branch is not fully merged into the current branch!</Alert
						>
					{/if}
					{#if alert === 'protectedWords'}
						<Alert
							feedback="warning"
							data-testid="protected-words-alert"
							id={`branch-${data.name}-alert-${alert}`}
						>
							<div id={`branch-${data.name}-alert-${alert}-content`}>
								You're selecting a branch with the name <strong>{data.name}</strong>, review and
								make sure you really wanna delete this branch!
							</div>
						</Alert>
					{/if}
					{#if alert === 'offensiveWords'}
						<Alert
							feedback="danger"
							data-testid="offensive-words-alert"
							id={`branch-${data.name}-alert-${alert}`}
						>
							<div id={`branch-${data.name}-alert-${alert}-content`}>
								The branch name <strong>master</strong> is offensive. Check out this
								<a
									href="https://sfconservancy.org/news/2020/jun/23/gitbranchname/"
									target="_blank"
									id={`branch-${data.name}-alert-${alert}-link`}>article</a
								>
								and make sure to change the branch name to <strong>main</strong>,
								<strong>default</strong>,
								<strong>truck</strong> or any other word that don't offend others!
							</div>
						</Alert>
					{/if}
				{/each}
			</Group>
		{/if}
	</div>
</div>
