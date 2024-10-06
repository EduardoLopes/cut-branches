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
	import { visuallyHidden } from '@pindoba/panda/patterns';
	import { token } from '@pindoba/panda/tokens';

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
		background: 'primary.50'
	})}
>
	<div
		class={css({
			display: 'flex',
			gap: 'md',
			padding: 'md',
			alignItems: 'center',
			borderBottom: '1px dashed token(colors.primary.300)',
			minHeight: '58px'
		})}
	>
		<Icon
			icon="game-icons:tree-branch"
			width="24px"
			height="24px"
			color={token('colors.primary.800')}
		/>
		<h1
			class={css({
				color: 'primary.800.contrast',
				fontSize: 'lg',
				margin: '0',
				fontWeight: 'bold'
			})}
		>
			Cut Branches
		</h1>
	</div>
	<div
		class={css({
			minWidth: '260px',
			px: 'token(spacing.sm)'
		})}
	>
		<div
			class={css({
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				py: 'token(spacing.sm)'
			})}
		>
			<h2
				class={css({
					fontSize: 'xs',
					textTransform: 'uppercase',
					color: 'neutral.800',
					margin: '0'
				})}
			>
				Repositories
			</h2>
			<Loading isLoading={$createRepositoryIDMutation.isPending}>
				<Button size="sm" onclick={handleAddClick} shape="square">
					<Icon icon="material-symbols:add-rounded" width="24px" height="24px" />
					<span class={visuallyHidden()}>Add repository</span>
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
	</div>

	<div
		class={css({
			fontSize: 'sm',
			padding: 'token(spacing.xxs) token(spacing.xs)',
			borderTop: '1px dashed token(colors.primary.300)',
			background: 'primary.200',
			textAlign: 'left',
			color: 'primary.900'
		})}
	>
		v{version}
	</div>
</section>
