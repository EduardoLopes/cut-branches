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
		gridTemplateRows: 'min-content auto min-content'
	})}
>
	<div
		class={css({
			display: 'flex',
			gap: 'md',
			padding: 'md',
			alignItems: 'center',
			_dark: {
				borderBottom: '0px dashed token(colors.primary.300)'
			},
			_light: {
				borderBottom: '0px dashed token(colors.primary.700)'
			},
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
					color: 'primary.800'
				}
			})}
		/>
		<h1
			class={css({
				_dark: {
					color: 'primary.950'
				},
				_light: {
					color: 'primary.800'
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
			px: 'md'
		})}
	>
		<div
			class={css({
				display: 'flex',
				flexDirection: 'column',
				gap: 'sm',
				p: 'sm',

				_light: {
					bg: 'neutral.50'
				},
				_dark: {
					bg: 'neutral.100'
				},
				borderTopRadius: 'md'
			})}
		>
			<div
				class={css({
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center'
				})}
			>
				<h2
					class={css({
						fontSize: 'xs',
						textTransform: 'uppercase',
						opacity: 0.6,
						color: 'neutral.950',
						margin: '0'
					})}
				>
					Repositories
				</h2>

				<AddButton
					size="sm"
					shape="square"
					icon="material-symbols:add-rounded"
					visuallyHiddenLabel={true}
					passThrough={{
						root: css.raw({})
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
							maxHeight: 'calc(100vh - 146px)',
							overflowY: 'auto',
							backdropFilter: 'none',
							padding: '0',
							background: 'transparent'
						}),
						itemsContainer: css.raw({
							background: 'transparent',
							gap: 'xxs'
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
	</div>
</section>
