<script lang="ts">
	import { repos, type RepoID } from '$lib/stores';

	import Button from '@pindoba/svelte-button';
	import Loading from '@pindoba/svelte-loading';
	import Navigation from '@pindoba/svelte-navigation';
	import Icon from '@iconify/svelte';
	import { useCreateRepositoryID } from '$lib/services/useCreateRepositoryID';
	import { goto } from '$app/navigation';
	import { toast } from '$lib/primitives/Toast.svelte';
	import { version } from '$app/environment';
	import { page } from '$app/stores';
	import { css } from '@pindoba/panda/css';

	const sortBy = 'BRANCH_COUNT';

	function handleSort(a: RepoID, b: RepoID) {
		if (sortBy === 'BRANCH_COUNT') {
			// TODO
		}

		return a.name.localeCompare(b.name);
	}

	const createRepositoryIDMutation = useCreateRepositoryID({
		onSuccess(data, variables, context) {
			goto(`/repos/${data.id}`, {
				state: {
					path: data.path,
					name: data.name,
					id: data.id
				}
			});
		},
		meta: {
			showErrorToast: true
		}
	});

	async function handleAddClick() {
		const { open } = await import('@tauri-apps/api/dialog');

		if (open) {
			open({ directory: true })
				.then(async (dir) => {
					if (dir && typeof dir === 'string') {
						$createRepositoryIDMutation.mutate({
							path: dir
						});
					}
				})
				.catch((error) => {
					toast.danger({ message: error });
				});
		}
	}

	const items = $derived(
		$repos.map((repo) => ({
			id: repo.id,
			label: repo.name,
			href: `/repos/${repo.id}`,
			badge: repo.branchesCount ? `${repo.branchesCount}` : undefined
		}))
	);
</script>

<section
	class={css({
		display: 'grid',
		gridTemplateRows: 'min-content auto min-content',
		background: 'primary.800'
	})}
>
	<div class="logo-container">
		<Icon icon="game-icons:tree-branch" width="24px" height="24px" color="#fff" />
		<h1 class="logo">Cut Branches</h1>
	</div>
	<nav class="content">
		<div class="title">
			<h2>Repositories</h2>
			<Loading isLoading={$createRepositoryIDMutation.isPending}>
				<Button size="sm" onclick={handleAddClick}>
					<Icon icon="material-symbols:add-rounded" width="24px" height="24px" />
				</Button>
			</Loading>
		</div>
		{#if $repos}
			<Navigation
				{items}
				activeItem={$page.params.id}
				direction="vertical"
				passThrough={{
					root: css.raw({
						bg: 'transparent'
					}),
					item: css.raw({
						color: 'primary.800.contrast'
					})
				}}
			/>
		{/if}
	</nav>

	<div class="bottom-info-bar">v{version}</div>
</section>

<style src="./styles.scss" lang="scss">
	.logo-container {
		display: flex;
		gap: 1rem;
		align-items: center;
		background: var(--color-primary-7);
		border-bottom: 1px dashed var(--color-primary-6);
		min-height: 58px;

		.logo {
			color: #fff;
			font-size: 1.6rem;
			margin: 0;
			font-weight: bold;
		}
	}

	.content {
		min-width: 260px;
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
			padding: 1.2rem 0;
		}
	}

	.bottom-info-bar {
		font-size: 1.2rem;
		padding: 0.4rem 0.8rem;
		border-top: 1px dashed var(--color-primary-7);
		background: var(--color-primary-6);
		text-align: left;
		color: var(--color-neutral-1);
	}
</style>
