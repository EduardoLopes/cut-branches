<script lang="ts">
	import Loading from '@pindoba/svelte-loading';
	import Navigation, { type NavigationItem } from '@pindoba/svelte-navigation';
	import { createGetRepositoryListQuery } from '../logic/application/queries/create-get-repository-list-query';
	import { page } from '$app/state';
	import { eventBus, Events } from '$services/event-bus';
	import IconButton from '$ui/core/icon-button.svelte';
	import { css } from '@pindoba/panda/css';

	// Query for repositories list from database
	const repositoriesQuery = $derived(createGetRepositoryListQuery());

	// Track if repository is being added
	let isAddingRepository = $state(false);

	// Subscribe to repository adding events
	$effect(() => {
		const addingSubscription = eventBus.subscribe(Events.REPOSITORY_ADDING, () => {
			isAddingRepository = true;
		});

		const addedSubscription = eventBus.subscribe(Events.REPOSITORY_ADDED, () => {
			isAddingRepository = false;
		});

		const failedSubscription = eventBus.subscribe(Events.REPOSITORY_ADD_FAILED, () => {
			isAddingRepository = false;
		});

		return () => {
			addingSubscription.unsubscribe();
			addedSubscription.unsubscribe();
			failedSubscription.unsubscribe();
		};
	});

	// Map repository data to navigation items
	const items = $derived.by<NavigationItem[]>(() => {
		if (!repositoriesQuery.data) {
			return [];
		}

		const repositories = repositoriesQuery.data;
		const mappedItems = repositories.map((repo) => ({
			id: repo.id,
			label: repo.name,
			href: `/repos/${repo.id}`,
			badge: repo.branchesCount > 0 ? `${repo.branchesCount}` : undefined
		}));

		// Sort by name
		return [...mappedItems].sort((a, b) => a.label.localeCompare(b.label));
	});

	function handleAddRepository() {
		eventBus.publish(Events.REPOSITORY_ADD_REQUESTED);
	}
</script>

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

			<IconButton
				onclick={handleAddRepository}
				size="sm"
				shape="square"
				icon="material-symbols:add-rounded"
				label="Add a git repository"
				visuallyHiddenLabel={true}
				disabled={isAddingRepository}
				passThrough={{
					root: css.raw({})
				}}
			/>
		</div>
		<Loading
			isLoading={repositoriesQuery.isLoading || isAddingRepository}
			passThrough={{
				root: css.raw({
					width: 'full'
				})
			}}
		>
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
		</Loading>
	</div>
</div>
