<script lang="ts">
	import type { IBranch, IRepo } from '$lib/stores';
	import { repos } from '$lib/stores';
	import Icon from '@iconify/svelte';

	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Alert from '$lib/primitives/Alert.svelte';
	import Group from '$lib/primitives/Group.svelte';

	export let data: IBranch;
	export let selected = false;
	export let disabled = false;

	let id = $page.params.id;

	let currentRepo: IRepo | undefined;

	onMount(() => {
		currentRepo = $repos.filter((item) => item.name === id)[0];
	});

	let protectedWords = [
		'develop',
		'dev',
		'stg',
		'staging',
		'master',
		'hml',
		'master',
		'default',
		'trunk'
	];
</script>

<div
	class="branch"
	class:disabled
	class:current={data.current}
	class:selected
	title={`${data.current ? 'Current branch ' : ''}`}
>
	<div class="name">
		{data.name}
	</div>

	<div class="info alert-group">
		<Group direction="column">
			{#if data.fully_merged}
				<Alert feedback="info" size={'sm'}>
					This branch is not fully merged into the current branch, {currentRepo?.current_branch}!
				</Alert>
			{/if}
			{#if data.name.includes('master')}
				<Alert feedback="danger" size={'sm'}>
					The branch name <strong>master</strong> is offensive. Check out this
					<a href="https://sfconservancy.org/news/2020/jun/23/gitbranchname/" target="_blank"
						>article</a
					>
					and make sure to change the branch name to <strong>main</strong>,
					<strong>default</strong>, <strong>truck</strong> or any other word that don't offend others!
				</Alert>
			{/if}
			{#if protectedWords.some((item) => data.name.includes(item)) && selected}
				<Alert feedback="warning" size={'sm'}>
					You're selecting a branch with the name <strong>{data.name}</strong>, review and make sure
					you really wanna delete this branch!
				</Alert>
			{/if}
		</Group>
	</div>
</div>

<style lang="scss">
	.transition {
		transition-timing-function: ease-in-out;
		transition-duration: 0.1s;
		transition-property: width, height, border, color, background, padding, font-size;
	}

	.alert-group {
		:global {
			.alert {
				border-width: 0;
				border-top-width: 1px;
				border-top-right-radius: 0;
				border-top-left-radius: 0;
			}
		}
	}

	.branch {
		background: var(--color-neutral-4);
		border: 1px solid var(--color-neutral-7);
		border-radius: 4px;

		.name {
			color: var(--color-neutral-12);
			font-weight: 600;
			padding: 1.6rem;
		}

		@extend .transition;

		&.selected {
			background: var(--color-danger-3);
			border-color: var(--color-danger-10);
			border-style: dashed;

			.name {
				color: var(--color-danger-9);
			}
		}
	}
</style>
