<script lang="ts">
	import { repos } from '$lib/stores';
	import type { IRepo } from '$lib/stores';
	import Button from '$lib/primitives/Button/index.svelte';
	import { page } from '$app/stores';
	import Icon from '@iconify/svelte';
	import { useGetRootPath } from '$lib/services/useGetRootPath';
	import { goto } from '$app/navigation';
	import { toast } from '$lib/primitives/Toast.svelte';
	import { version } from '$app/environment';

	export let sortBy = 'BRANCH_COUNT';

	function handleSort(a: IRepo, b: IRepo) {
		if (sortBy === 'BRANCH_COUNT') {
			// TODO
		}

		return a.name.localeCompare(b.name);
	}

	let lastPathSelected: string | undefined;

	$: getRootPath = useGetRootPath(lastPathSelected, {
		enabled: Boolean(lastPathSelected),
		onError: (errors) => {
			errors.reverse().forEach((item) => toast.danger({ message: item }));
		}
	});

	$: if ($getRootPath.data) {
		goto(`/repos/${$getRootPath.data.name}`, {
			state: {
				path: $getRootPath.data.path,
				name: $getRootPath.data.name
			}
		});
	}

	async function handleAddClick() {
		const { open } = await import('@tauri-apps/api/dialog');

		if (open) {
			open({ directory: true })
				.then(async (dir) => {
					if (dir && typeof dir === 'string') {
						lastPathSelected = dir;
					}
				})
				.catch((error) => {
					toast.danger({ message: error });
				});
		}
	}
</script>

<section class="container">
	<div class="logo-container">
		<Icon icon="game-icons:tree-branch" width="24px" height="24px" color="#fff" />
		<h1 class="logo">Cut Branches</h1>
	</div>
	<nav class="content">
		<div class="title">
			<h2>Repositories</h2>
			<Button size="sm" on:click={handleAddClick}>
				<Icon icon="material-symbols:add-rounded" width="24px" height="24px" />
			</Button>
		</div>
		{#if $repos}
			<ul class="menu">
				{#each $repos.sort(handleSort) as repo (repo.name)}
					<li class:current={$page.params.id === repo.name}>
						<a href={`/repos/${repo.name}`}
							>{repo.name}<span class="count"
								>{repo.branches.length} {repo.branches.length > 0 ? 'branches' : 'branch'}</span
							>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</nav>

	<div class="bottom-info-bar"> v{version} </div>
	
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
	}

	.content {
		.title {
			display: flex;
			justify-content: space-between;
			align-items: center;
			h2 {
				font-weight: bold;
				font-size: 1.3rem;
				text-transform: uppercase;
				color: #fff;
				margin: 0;
			}
			padding: 1.2rem 1rem;

			:global {
				button {
					border: var(--color-primary-1) 1px solid;
				}
			}
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
			cursor: pointer;
			&.current {
				a {
					background: var(--color-primary-5);
					cursor: default;
				}
				pointer-events: none;
			}

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
				}

				&:active {
					filter: contrast(75%);
				}

				& span {
					font-size: 0.8em;
					font-weight: normal;
				}
			}
		}
	}

	.bottom-info-bar {
		font-size: 1.2rem;
		padding: 0.4rem 0.8rem;
		border-top: 1px dashed var(--color-primary-3);
		background: var(--color-primary-2);
		text-align: left;
		color: var(--color-neutral-1);
	}
</style>
