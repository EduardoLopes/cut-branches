<script lang="ts">
	import type { IBranch, IRepo } from '$lib/stores';
	import { repos } from '$lib/stores';
	import Icon from '@iconify/svelte';

	import { onMount } from 'svelte';
	import { page } from '$app/stores';

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

	<div class="info">
		{#if data.fully_merged}
			<div class="grid-2">
				<span class="icon">
					<Icon icon="mdi:information-variant-circle-outline" width="16px" height="16px" /></span
				>
				<div>
					This branch is not fully merged into the current branch, {currentRepo?.current_branch}!
				</div>
			</div>
		{/if}
		{#if data.name.includes('master')}
			<div class="grid-2">
				<span class="icon"> <Icon icon="ph:warning-bold" width="16px" height="16px" /></span>
				<div>
					The branch name <strong>master</strong> is offensive. Check out this
					<a href="https://sfconservancy.org/news/2020/jun/23/gitbranchname/" target="_blank"
						>article</a
					>
					and make sure to change the branch name to <strong>main</strong>,
					<strong>default</strong>, <strong>truck</strong> or any other word that don't offend others!
				</div>
			</div>
		{/if}
		{#if protectedWords.some((item) => data.name.includes(item)) && selected}
			<div class="grid-2">
				<span class="icon"> <Icon icon="ph:warning-bold" width="16px" height="16px" /></span>
				<div>
					You're selecting a branch with the name <strong>{data.name}</strong>, review and make sure
					you really wanna delete this branch!
				</div>
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.transition {
		transition-timing-function: ease-in-out;
		transition-duration: 0.1s;
		transition-property: width, height, border, color, background, padding, font-size;
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
			border-color: var(--color-danger-2);
			border-style: dashed;
			.name {
				color: var(--color-danger-3);
			}
		}
	}
</style>
