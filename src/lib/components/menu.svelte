<script lang="ts">
	import Icon from '@iconify/svelte';
	import Navigation, { type NavigationItem } from '@pindoba/svelte-navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import AddButton from '$lib/components/add-button.svelte';
	import { getRepositoryStore, RepositoryStore } from '$lib/stores/repository.svelte';
	import { css } from '@pindoba/panda/css';

	// Create a reactive variable to track the repositories list
	const repoList = $derived(RepositoryStore.repositories.list);

	// Add an onMount to ensure repositories are loaded
	onMount(() => {
		// This will ensure repository stores are loaded and initialized
		RepositoryStore.loadRepositories();
	});

	// This function gets the repository menu items by mapping through the repository list
	const getItems = $derived.by<NavigationItem[]>(() => {
		const mappedAndFilteredItems = repoList
			.map((repoName) => {
				const repository = getRepositoryStore(repoName);
				if (repository?.state) {
					return {
						id: repository.state.id,
						label: repository.state.name,
						href: `/repos/${repository.state.name}`,
						badge:
							repository.state.branchesCount > 0 ? `${repository.state.branchesCount}` : undefined
					} satisfies NavigationItem;
				}
				return undefined;
			})
			.filter((item) => {
				return !!item;
			});

		// Use spread syntax to create a new array before sorting
		return [...mappedAndFilteredItems].sort((a, b) => {
			return a.label.localeCompare(b.label);
		});
	});

	// Create a reactive list of menu items that will update when repository states change
	const items = $derived(getItems);
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
					activeItem={page.params.id}
					direction="vertical"
					passThrough={{
						root: css.raw({
							maxHeight: 'calc(100vh - 146px)',
							overflowY: 'auto',
							backdropFilter: 'none',
							padding: '0',
							_light: {
								bg: 'neutral.50'
							},
							_dark: {
								bg: 'neutral.100'
							}
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
