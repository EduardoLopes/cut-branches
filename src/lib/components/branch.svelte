<script lang="ts">
	import type { IBranch } from '$lib/stores/repos';
	import Alert from '@pindoba/svelte-alert';
	import Group from '@pindoba/svelte-group';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import { css } from '@pindoba/panda/css';

	interface Props {
		data: IBranch;
		selected: boolean;
		disabled?: boolean;
	}

	let { data, selected, disabled }: Props = $props();

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

<div
	class={css({
		borderRadius: 'md',
		borderWidth: '1px',
		borderColor: 'neutral.400',
		_light: {
			background: 'neutral.50'
		},
		_dark: {
			background: 'neutral.100'
		},
		color: 'neutral.950.contrast',
		'&.disabled': {
			opacity: 0.5,
			pointerEvents: 'none',
			filter: 'grayscale(1)'
		},
		'&.current': {
			_dark: {
				background: 'primary.200'
			},
			_light: {
				background: 'primary.400'
			},
			borderWidth: '1px',
			borderColor: 'primary.800',
			color: 'primary.950'
		},
		'&.selected': {
			background: 'danger.200',
			borderColor: 'danger.800',
			borderStyle: 'dashed'
		}
	})}
	class:disabled
	class:current={data.current}
	class:selected
	title={`${data.current ? 'Current branch ' : ''}`}
>
	<div
		class={css({
			padding: 'md',
			color: 'inherit',
			fontWeight: 600
		})}
	>
		{data.name}
	</div>

	<div class="info alert-group">
		{#each alerts as alert (alert)}
			<div
				animate:flip={{ duration: 150 }}
				in:fly|local={{ y: -20, duration: 200 }}
				out:fly|local={{ y: -10, duration: 50 }}
			>
				<Group direction="vertical" noBorder>
					{#if alert === 'fullyMerged'}
						<Alert>This branch is not fully merged into the current branch!</Alert>
					{/if}
					{#if alert === 'protectedWords'}
						<Alert feedback="warning">
							<div>
								You're selecting a branch with the name <strong>{data.name}</strong>, review and
								make sure you really wanna delete this branch!
							</div>
						</Alert>
					{/if}
					{#if alert === 'offensiveWords'}
						<Alert feedback="danger">
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
				</Group>
			</div>
		{/each}
	</div>
</div>
