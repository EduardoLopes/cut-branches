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
			fullyMerged: data.fully_merged,
			protectedWords: protectedWords.some((item) => data.name.includes(item)) && selected,
			offensiveWords: data.name.includes('master')
		})
			.filter((item) => item[1] === true)
			.map((item) => item[0])
	);
</script>

<div class={colorPalette}>
	<div
		class={css({
			borderRadius: 'md',
			borderWidth: '1px',
			borderColor: 'colorPalette.400',
			_light: {
				background: 'colorPalette.50'
			},
			_dark: {
				background: 'colorPalette.100'
			},
			color: 'colorPalette.950.contrast',
			'&.disabled, &.locked': {
				opacity: 0.5,
				pointerEvents: 'none',
				filter: 'grayscale(1)'
			},
			'&.selected': {
				background: 'danger.200',
				borderColor: 'danger.800',
				borderStyle: 'dashed'
			},
			pindobaTransition: 'fast'
		})}
		class:disabled
		class:locked
		class:current={data.current}
		class:selected
		title={`${data.current ? 'Current branch ' : ''}`}
	>
		<div
			class={css({
				padding: 'md',
				display: 'flex',
				flexDirection: 'column'
			})}
		>
			<span
				class={css({
					color: 'inherit',
					fontWeight: 600,
					pindobaTransition: 'fast'
				})}
				data-testid="branch-name">{data.name}</span
			>
		</div>

		<div
			class={css({
				p: 'md',
				display: 'flex',
				flexDirection: 'column',
				borderTopWidth: '1px',
				borderTopColor: 'colorPalette.400',
				borderTopStyle: 'solid'
			})}
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
					pindobaTextColor: 'xs'
				})}
			>
				<Icon icon="lucide:git-commit-horizontal" width="16px" height="16px" /> Last commit
			</div>
			<span
				class={css({
					fontSize: 'sm',
					color: 'colorPalette.950',
					pindobaTransition: 'fast'
				})}
				data-testid="last-commit-message"
			>
				{data.last_commit.message}
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
						pindobaTextColor: 'sm',
						pindobaTransition: 'fast'
					})}
					title={data.last_commit.email.replace(/^<|>$/g, '')}
					data-testid="author-name"
				>
					<Icon icon="lucide:circle-user-round" width="16px" height="16px" />
					{data.last_commit.author}
				</span>
				<span
					class={css({
						fontSize: 'sm',
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						gap: 'xxs',
						pindobaTextColor: 'xs',
						pindobaTransition: 'fast'
					})}
					title={formatDate(data.last_commit.date)}
				>
					<Icon icon="lucide:clock" width="16px" height="16px" />{intlFormatDistance(
						data.last_commit.date,
						Date.now(),
						{ unit: 'day' }
					)}
				</span>
			</div>
		</div>

		<div class="info alert-group">
			<Group direction="vertical" noBorder>
				{#each alerts as alert (alert)}
					{#if alert === 'fullyMerged' && !data.current}
						<Alert>This branch is not fully merged into the current branch!</Alert>
					{/if}
					{#if alert === 'protectedWords'}
						<Alert feedback="warning" data-testid="protected-words-alert">
							<div>
								You're selecting a branch with the name <strong>{data.name}</strong>, review and
								make sure you really wanna delete this branch!
							</div>
						</Alert>
					{/if}
					{#if alert === 'offensiveWords'}
						<Alert feedback="danger" data-testid="offensive-words-alert">
							<div>
								The branch name <strong>master</strong> is offensive. Check out this
								<a href="https://sfconservancy.org/news/2020/jun/23/gitbranchname/" target="_blank"
									>article</a
								>
								and make sure to change the branch name to <strong>main</strong>,
								<strong>default</strong>,
								<strong>truck</strong> or any other word that don't offend others!
							</div>
						</Alert>
					{/if}
				{/each}
			</Group>
		</div>
	</div>
</div>
