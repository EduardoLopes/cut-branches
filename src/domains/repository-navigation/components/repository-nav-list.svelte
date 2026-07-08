<script lang="ts">
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Loading from '@pindoba/svelte-loading';
	import Navigation, { type NavigationItem } from '@pindoba/svelte-navigation';
	import Stamp from '@pindoba/svelte-stamp';
	import { createRawSnippet, mount, unmount, type Snippet } from 'svelte';
	import { createPrefetchRepositoryData } from '../core/composables/create-prefetch-repository-data';
	import { page } from '$app/state';
	import { createGetRepositoryListQuery } from '$infrastructure/queries/create-get-repository-list-query';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		headerAction?: Snippet<[]>;
		/**
		 * Collapses the list to a narrow rail: `'icon'` is icons-only (label as an
		 * auto tooltip); `'stack'` shows the icon above its label. `'none'` is the
		 * full-width list.
		 */
		compact?: 'none' | 'icon' | 'stack';
	}

	const { headerAction, compact = 'none' }: Props = $props();

	const isRail = $derived(compact !== 'none');

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
				// In the icon rail the branch-count badge has no room; drop it and let
				// the Navigation auto-derive a tooltip from `label` instead.
				trailing: isRail ? undefined : makeBadgeSnippet(repo.name, repo.id, repo.branchesCount),
				// Prefetch repository data on hover for instant navigation
				onmouseenter: () => prefetchRepositoryData(repo.id)
			})
		) satisfies NavigationItem[];

		// Sort by name
		return [...mappedItems].sort((a, b) => a.label.toString().localeCompare(b.label.toString()));
	});
</script>

{#snippet repoIcon()}
	<Stamp size="sm" shape="square" emphasis="ghost" background="transparent" border="none">
		<Icon icon="lucide:folder-git-2" />
	</Stamp>
{/snippet}

<div
	class={css({
		px: 'md',
		flex: 1,
		minHeight: 0,
		display: 'flex',
		flexDirection: 'column',
		marginBottom: 'md'
	})}
	style:width={isRail ? 'auto' : '260px'}
>
	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			gap: 'xs',
			borderRadius: 'lg',
			// No right padding so the scroll box (and its scrollbar) can sit flush
			// against the card's right edge.
			padding: 'xs',
			paddingBottom: 'xs',
			paddingLeft: 'xs',
			paddingRight: 0,
			background: 'neutral.surface.deep',
			flex: 1,
			minHeight: 0
		})}
	>
		<div
			class={css({
				display: 'flex',
				alignItems: 'center',
				width: 'full',
				minHeight: '2rem'
			})}
			style:justify-content={isRail ? 'center' : 'space-between'}
		>
			{#if !isRail}
				<h2
					class={css({
						fontSize: 'xs',
						textTransform: 'uppercase',
						opacity: 0.6,
						color: 'neutral.text',
						margin: '0',
						alignSelf: 'flex-end'
					})}
				>
					Repositories
				</h2>
			{/if}
			<div
				class={css({
					mr: 'xs'
				})}
			>
				{#if headerAction}
					{@render headerAction()}
				{/if}
			</div>
		</div>
		<!--
			The scroll lives on this wrapper, NOT on <Loading>: Pindoba's Loading
			root is `display: contents`, so it generates no box and can't scroll or
			flex. This real div owns the bounded height + overflow instead.
		-->
		<div
			class={css({
				flex: 1,
				minHeight: 0,
				overflowY: 'auto',
				width: 'full',
				// The card no longer pads its right side, so the scroll box already
				// reaches the card edge and the scrollbar sits flush against it. Keep a
				// small right padding so the nav items don't tuck under the scrollbar.
				paddingRight: 'xs'
			})}
		>
			<Loading
				loading={repositoriesQuery.isLoading}
				passThrough={{ root: { style: css.raw({ width: 'full', backdropFilter: 'none' }) } }}
			>
				{#if items.length > 0}
					<Navigation
						{items}
						activeItem={page.params.id}
						direction="vertical"
						emphasis="neutral"
						background="transparent"
						{compact}
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
</div>
