<script lang="ts">
	import Icon from '@iconify/svelte';
	import Navigation, { type NavigationItem } from '@pindoba/svelte-navigation';
	import { untrack } from 'svelte';
	import { page } from '$app/stores';
	import AddButton from '$lib/components/add-button.svelte';
	import { getRepositoryStore, RepositoryStore } from '$lib/stores/repository.svelte';
	import { css } from '@pindoba/panda/css';

	const items = $derived(
		RepositoryStore.repositories.list
			.map((repo) => {
				return untrack(() => {
					const repository = getRepositoryStore(repo);
					if (repository?.state) {
						return {
							id: repository.state.id,
							label: repository.state.name,
							href: `/repos/${repository.state.name}`,
							badge: repository.state.branchesCount
								? `${repository.state.branchesCount}`
								: undefined
						} as NavigationItem;
					}
					return undefined;
				});
			})
			.filter((item) => {
				return !!item;
			})
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

			<AddButton
				size="sm"
				emphasis="secondary"
				shape="square"
				icon="material-symbols:add-rounded"
				visuallyHiddenLabel={true}
				passThrough={{
					root: css.raw({
						background: 'transparent',
						boxShadow: '0 0 0 1px token(colors.primary.700)'
					})
				}}
			/>
		</div>
		{#if items.length > 0}
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
		{:else}
			<p
				class={css({
					textAlign: 'center',
					padding: 'md',
					color: 'neutral.800.contrast',
					opacity: 0.7
				})}
			>
				No repositories
			</p>
		{/if}
	</div>
</section>
