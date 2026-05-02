<script lang="ts">
	import Icon from '@iconify/svelte';
	import Loading from '@pindoba/svelte-loading';
	import Navigation, { type NavigationItem } from '@pindoba/svelte-navigation';
	import Stamp from '@pindoba/svelte-stamp';
	import { createGetRepositoryListQuery } from '../core/composables/create-get-repository-list-query';
	import { createPrefetchRepositoryData } from '../core/composables/create-prefetch-repository-data';
	import { page } from '$app/state';
	import { eventBus, Events } from '$services/event-bus';
	import IconButton from '$ui/core/icon-button.svelte';
	import { css } from '@pindoba/styled-system/css';

	// Query for repositories list from database
	const repositoriesQuery = createGetRepositoryListQuery();

	// Prefetch function for repository data on hover
	const prefetchRepositoryData = createPrefetchRepositoryData();

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
		const mappedItems = repositories.map(
			(repo): NavigationItem => ({
				id: repo.id,
				label: repo.branchesCount > 0 ? `${repo.name} (${repo.branchesCount})` : repo.name,
				href: `/repos/${repo.id}`,
				'data-testid': `repository-${repo.name}-${repo.id}`,
				leading: repoIcon as NavigationItem['leading'],
				// Prefetch repository data on hover for instant navigation
				onmouseenter: () => prefetchRepositoryData(repo.id)
			})
		) satisfies NavigationItem[];

		// Sort by name
		return [...mappedItems].sort((a, b) => a.label.toString().localeCompare(b.label.toString()));
	});

	function handleAddRepository() {
		eventBus.publish(Events.REPOSITORY_ADD_REQUESTED);
	}
</script>

{#snippet repoIcon()}
	<Stamp
		emphasis="primary"
		feedback="primary"
		border="none"
		background="transparent"
		passThrough={{
			root: {
				style: css.raw({
					opacity: '0.7'
				})
			}
		}}
	>
		<Icon icon="lucide:folder-git-2" width="14px" height="14px" />
	</Stamp>
{/snippet}

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
			gap: 'xs',
			borderRadius: 'md',
			padding: 'xs',
			background: 'neutral.surface.deep'
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
					color: 'neutral.text',
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
					root: {
						style: css.raw({})
					}
				}}
			/>
		</div>
		<Loading
			loading={repositoriesQuery.isLoading || isAddingRepository}
			passThrough={{
				root: {
					style: css.raw({
						width: 'full',
						maxHeight: 'calc(100vh - 146px)',
						overflowY: 'auto',
						backdropFilter: 'none'
					})
				}
			}}
		>
			{#if items.length > 0}
				<Navigation
					{items}
					activeItem={page.params.id}
					direction="vertical"
					passThrough={{
						item: {
							style: css.raw({
								pr: '2xs'
							})
						}
					}}
				/>
			{:else}
				<p
					class={css({
						textAlign: 'center',
						padding: 'md',
						color: 'neutral.text.muted',
						opacity: 0.7
					})}
				>
					No repositories
				</p>
			{/if}
		</Loading>
	</div>
</div>
