<script lang="ts">
	import { repos, currentRepo, loadingRepoInfo } from '$lib/stores';
	import type { IRepo } from '$lib/stores';
	import { onMount } from 'svelte';
	import GiTreeBranch from 'svelte-icons/gi/GiTreeBranch.svelte';
	import Icon from '$lib/primitives/Icon/index.svelte';
	import MdAddCircleOutline from 'svelte-icons/md/MdAddCircleOutline.svelte';
	import Button from '$lib/primitives/Button/index.svelte';
	import type { OpenDialogOptions } from '@tauri-apps/api/dialog';
	import { getRepoInfo, toast } from '$lib/utils';
	import { page } from '$app/stores';

	export let sortBy = 'BRANCH_COUNT';

	function handleSort(a: IRepo, b: IRepo) {
		if (sortBy === 'BRANCH_COUNT') {
			// TODO
		}

		return a.name.localeCompare(b.name);
	}

	let apiOpen: (options?: OpenDialogOptions | undefined) => Promise<string | string[] | null>;
	onMount(async () => {
		const { open } = await import('@tauri-apps/api/dialog');

		apiOpen = open;
	});

	function handleAddClick() {
		apiOpen({ directory: true })
			.then((dir) => {
				if (dir && typeof dir === 'string') {
					getRepoInfo(dir)
						.then((res) => {
							if (res) {
								$repos = [...$repos.filter((item) => item.path !== res.path), res];
								$currentRepo = res;
							}
						})
						.catch((errors: string[]) => {
							errors.reverse().forEach((item) => toast.failure(item));
						});
				}
			})
			.catch((error) => {
				toast.failure(error);
			});
	}
</script>

<section class="container">
	<div class="logo-container">
		<Icon size="2.4rem" color="#fff">
			<GiTreeBranch />
		</Icon>

		<h1 class="logo">Cut Branches</h1>
	</div>
	<nav class="content">
		<div class="title">
			<h2>Repositories</h2>
			<Button size="sm" on:click={handleAddClick}>
				<Icon size="2rem" color="#FFF">
					<MdAddCircleOutline />
				</Icon>
			</Button>
		</div>
		{#if $repos}
			<ul class="menu">
				{#each $repos.sort(handleSort) as repo (repo.name)}
					<li>
						<a href={`/repos/${repo.name}`} class:current={$page.params.id === repo.name}
							>{repo.name}<span class="count"
								>{repo.branches.length} {repo.branches.length > 0 ? 'branches' : 'branch'}</span
							>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</nav>
</section>

<style src="./styles.scss" lang="scss">
	.logo-container {
		display: flex;
		gap: 0.8rem;
		align-items: center;
		padding: 1.6rem;
		background: var(--color-primary-3);
		border-bottom: 1px dashed var(--color-primary-1);

		.logo {
			color: #fff;
			font-size: 1.6rem;
			margin: 0;
			font-weight: bold;
		}
	}
	.container {
		display: grid;
		grid-template-rows: min-content auto min-content;
		background: var(--color-primary-3);
		height: 100vh;
	}

	.content {
		.title {
			display: flex;
			justify-content: space-between;
			align-items: center;
			h2 {
				font-weight: bold;
				font-size: 1.1rem;
				text-transform: uppercase;
				color: #fff;
				margin: 0;
			}
			padding: 0.5rem 1rem;
		}
	}

	.menu {
		list-style: none;
		margin: 0;
		padding: 0;
		font-size: 0.9em;
		height: 100%;
		min-width: 270px;
		margin-block-start: 0;
		margin-block-end: 0;
		margin-inline-start: 0;
		margin-inline-end: 0;
		padding-inline-start: 0;

		li {
			margin: 0;
			a {
				display: inline-flex;
				flex-direction: column;
				width: 100%;
				border: none;
				padding: 8px 24px;
				background: none;
				text-align: left;
				font-weight: bold;
				color: #fff;
				margin: 0;
				text-decoration: none;

				&:hover {
					background: var(--color-primary-4);
					cursor: pointer;
				}

				&:active {
					filter: contrast(75%);
					cursor: pointer;
				}

				&.current {
					background: var(--color-primary-5);

					&:active {
						filter: contrast(100%);
					}
				}

				& span {
					cursor: pointer;
					font-size: 0.8em;
					font-weight: normal;
				}
			}
		}
	}
</style>
