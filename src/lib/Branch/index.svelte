<script lang="ts">
	import type { IBranch, RepoID } from '$lib/stores';
	import { repos } from '$lib/stores';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Alert from '$lib/primitives/Alert.svelte';
	import Group from '$lib/primitives/Group.svelte';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import { resizeContainer } from '$lib/actions/resizeContainer';

	export let data: IBranch;
	export let selected = false;
	export let disabled = false;

	let id = $page.params.id;
	let currentRepo: RepoID | undefined;
	let protectedWords = [
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

	onMount(() => {
		currentRepo = $repos.filter((item) => item.name === id)[0];
	});

	$: alerts = Object.entries({
		fullyMerged: data.fully_merged,
		protectedWords: protectedWords.some((item) => data.name.includes(item)) && selected,
		offensiveWords: data.name.includes('master')
	})
		.filter((item) => item[1] === true)
		.map((item) => item[0]);
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

	<div class="info alert-group" use:resizeContainer>
		<Group direction="column">
			{#each alerts as alert (alert)}
				<div
					animate:flip={{ duration: 150 }}
					in:fly|local={{ y: -20, duration: 200 }}
					out:fly|local={{ y: -10, duration: 50 }}
				>
					{#if alert === 'fullyMerged'}
						<Alert feedback="info">This branch is not fully merged into the current branch!</Alert>
					{/if}
					{#if alert === 'protectedWords'}
						<Alert feedback="warning">
							You're selecting a branch with the name <strong>{data.name}</strong>, review and make
							sure you really wanna delete this branch!
						</Alert>
					{/if}
					{#if alert === 'offensiveWords'}
						<Alert feedback="danger">
							The branch name <strong>master</strong> is offensive. Check out this
							<a href="https://sfconservancy.org/news/2020/jun/23/gitbranchname/" target="_blank"
								>article</a
							>
							and make sure to change the branch name to <strong>main</strong>,
							<strong>default</strong>,
							<strong>truck</strong> or any other word that don't offend others!
						</Alert>
					{/if}
				</div>
			{/each}
		</Group>
	</div>
</div>

<style lang="scss">
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
		background: var(--color-neutral-2);
		border: 1px solid var(--color-neutral-4);
		border-radius: 4px;

		.name {
			color: var(--color-neutral-9);
			font-weight: 600;
			padding: 1.6rem;
		}

		&.current {
			background: var(--color-warning-1);
			border-color: var(--color-warning-4);

			.name {
				color: var(--color-warning-5);
			}
		}

		&.selected {
			background: var(--color-danger-2);
			border-color: var(--color-danger-4);
			border-style: dashed;

			.name {
				color: var(--color-danger-7);
			}
		}
	}
</style>
