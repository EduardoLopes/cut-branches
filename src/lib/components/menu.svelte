<script lang="ts">
	import Icon from '@iconify/svelte';
	import Loading from '@pindoba/svelte-loading';
	import Navigation from '@pindoba/svelte-navigation';
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import AddButton from '$lib/components/add-button.svelte';
	import { getRepoByPath } from '$lib/services/getRepoByPath';
	import { notifications } from '$lib/stores/notifications.svelte';
	import { repositories } from '$lib/stores/repositories.svelte';
	import { css } from '@pindoba/panda/css';

	let path = $state<string | undefined>('');
	const repoQuery = getRepoByPath(() => path);

	$effect(() => {
		if (repoQuery.data) {
			goto(`/repos/${repoQuery.data.id}`, {
				state: {
					path: repoQuery.data.path,
					name: repoQuery.data.name,
					id: repoQuery.data.id
				}
			});
		}

		if (repoQuery.isError) {
			untrack(() =>
				notifications.push({
					feedback: 'danger',
					title: repoQuery.error.message,
					message: repoQuery.error.description
				})
			);
		}
	});

	const items = $derived(
		repositories.list.map((repo) => ({
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
		_dark: {
			background: 'primary.50',
			borderRight: '1px dashed token(colors.primary.300)'
		},
		_light: {
			borderRight: '1px dashed token(colors.primary.700)',
			background: 'primary.800'
		}
	})}
>
	<div
		class={css({
			display: 'flex',
			gap: 'md',
			padding: 'md',
			alignItems: 'center',
			_dark: {
				borderBottom: '1px dashed token(colors.primary.300)'
			},
			_light: {
				borderBottom: '1px dashed token(colors.primary.700)'
			},
			borderBottom: '1px dashed token(colors.primary.300)',
			height: 'calc((token(spacing.xl)) * 2.5)'
		})}
	>
		<Icon
			icon="game-icons:tree-branch"
			width="24px"
			height="24px"
			class={css({
				_dark: {
					color: 'primary.800'
				},
				_light: {
					color: 'primary.800.contrast'
				}
			})}
		/>
		<h1
			class={css({
				_dark: {
					color: 'primary.950'
				},
				_light: {
					color: 'primary.800.contrast'
				},
				textStyle: '4xl',
				margin: '0'
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
					opacity: 0.6,
					color: 'neutral.800.contrast',
					margin: '0'
				})}
			>
				Repositories
			</h2>
			<Loading isLoading={repoQuery.isLoading}>
				<AddButton
					size="sm"
					emphasis="secondary"
					shape="square"
					icon="material-symbols:add-rounded"
					iconColor="token(colors.primary.600)"
					visuallyHiddenLabel={true}
					passThrough={{
						root: css.raw({
							background: 'transparent',
							boxShadow: '0 0 0 1px token(colors.primary.700)'
						})
					}}
				/>
			</Loading>
		</div>
		{#if repositories.list.length > 0}
			<Navigation
				{items}
				activeItem={$page.params.id}
				direction="vertical"
				passThrough={{
					root: css.raw({
						bg: 'transparent',
						padding: '0',
						maxHeight: 'calc(100vh - 146px)',
						overflowY: 'auto',
						mx: '-sm'
					}),
					itemsContainer: css.raw({
						px: 'sm'
					}),
					item: css.raw({
						color: 'neutral.800.contrast',
						_hover: {
							color: 'primary.950'
						}
					}),
					itemActive: css.raw({
						color: 'primary.950.contrast'
					})
				}}
			/>
		{/if}
	</div>
</section>
