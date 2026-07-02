<script lang="ts">
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Loading from '@pindoba/svelte-loading';
	import Navigation, { type NavigationItem } from '@pindoba/svelte-navigation';
	import Stamp from '@pindoba/svelte-stamp';
	import { createRawSnippet, mount, unmount, type Snippet } from 'svelte';
	import { createGetRepositoryListQuery } from '../core/composables/create-get-repository-list-query';
	import { createPrefetchRepositoryData } from '../core/composables/create-prefetch-repository-data';
	import { page } from '$app/state';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		headerAction?: Snippet<[]>;
	}

	const { headerAction }: Props = $props();

	function makeBadgeSnippet(name: string, id: string, count: number): NavigationItem['trailing'] {
		return createRawSnippet(() => ({
			render: () => '<span style="display:contents"></span>',
			setup: (element) => {
				element.innerHTML = '';
				const badgeText = count > 0 ? String(count) : '';
				const badgeLabel = createRawSnippet(() => ({
					render: () => `<span>${badgeText}</span>`
				}));
				const instance = mount(Badge, {
					target: element,
					props: {
						size: 'sm',
						emphasis: 'adaptive',
						children: badgeLabel,
						'data-testid': `repository-${name}-badge-${id}`
					}
				});
				return () => {
					unmount(instance);
				};
			}
		}));
	}

	// Query for repositories list from database
	const repositoriesQuery = createGetRepositoryListQuery();

	// Prefetch function for repository data on hover
	const prefetchRepositoryData = createPrefetchRepositoryData();

	// Map repository data to navigation items
	const items = $derived.by<NavigationItem[]>(() => {
		if (!repositoriesQuery.data) {
			return [];
		}

		const repositories = repositoriesQuery.data;
		const mappedItems = repositories.map(
			(repo): NavigationItem => ({
				id: repo.id,
				label: repo.name,
				href: `/repos/${repo.id}`,
				'data-testid': `repository-${repo.name}-${repo.id}`,
				leading: repoIcon as NavigationItem['leading'],
				trailing: makeBadgeSnippet(repo.name, repo.id, repo.branchesCount),
				// Prefetch repository data on hover for instant navigation
				onmouseenter: () => prefetchRepositoryData(repo.id)
			})
		) satisfies NavigationItem[];

		// Sort by name
		return [...mappedItems].sort((a, b) => a.label.toString().localeCompare(b.label.toString()));
	});
</script>

{#snippet repoIcon()}
	<Stamp
		emphasis="ghost"
		border="none"
		background="transparent"
		iconFill
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

			{#if headerAction}
				{@render headerAction()}
			{/if}
		</div>
		<Loading
			loading={repositoriesQuery.isLoading}
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
				<Navigation {items} activeItem={page.params.id} direction="vertical" />
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
