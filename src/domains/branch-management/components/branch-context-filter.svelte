<script lang="ts">
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import { Choice, ChoiceItem } from '@pindoba/svelte-choice';
	import Stamp from '@pindoba/svelte-stamp';
	import { createGetBranchesQuery } from '../infrastructure/queries/create-get-branches-query';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	/**
	 * Active / Deleted split for the branches page.
	 *
	 * This is a *filter over one page's data*, not navigation to a sibling page,
	 * so it lives in the well's toolbar next to search and bulk actions rather
	 * than in the page header. It still drives real routes (`/repos/[id]` and
	 * `/repos/[id]/restore`) so the choice survives reload and deep links.
	 */
	interface Props {
		/** Repository id. */
		repositoryId: string;
	}

	const { repositoryId }: Props = $props();

	// `includeCurrent: true` is the backend default, so this fetches exactly what
	// omitting it fetched — but the query key embeds the input verbatim, and the
	// branches view and list both spell it out. Without it this tab strip pulled
	// a *second* full copy of every active branch over IPC, and ran a second
	// full conversion pass over it, purely to read `.length`. Matching the key
	// makes it the same cached query.
	const activeBranchesQuery = createGetBranchesQuery(
		() => ({ repoId: repositoryId, filters: { deletionStatus: 'active', includeCurrent: true } }),
		{ enabled: () => !!repositoryId }
	);
	const deletedBranchesQuery = createGetBranchesQuery(
		() => ({ repoId: repositoryId, filters: { deletionStatus: 'deleted' } }),
		{ enabled: () => !!repositoryId }
	);

	const activeCount = $derived(activeBranchesQuery.data?.branches.length ?? 0);
	const deletedCount = $derived(deletedBranchesQuery.data?.branches.length ?? 0);

	// The route is the source of truth for the active filter.
	const current = $derived(page.url.pathname.endsWith('/restore') ? 'deleted' : 'active');

	function goToFilter(next: string | undefined) {
		if (next === current) return;
		if (next === 'deleted') goto(resolve(`/repos/${repositoryId}/restore`));
		if (next === 'active') goto(resolve(`/repos/${repositoryId}`));
	}
</script>

<!--
	Keyed on the route-derived value so the Choice's internal selection can never
	drift from the active route (it can reset its own state on a re-render, which
	would otherwise swallow the next click).
-->
{#key current}
	<!--
		`padding="none"`: `appearance="button"` gives the Choice root its own inset,
		which makes the control taller than the `sm` search field and Delete button
		beside it. Dropping it lets all three sit on one line.
	-->
	<Choice
		type="radio"
		appearance="button"
		size="sm"
		padding="none"
		defaultValue={[current]}
		onValueChange={(value) => goToFilter(value[0])}
		aria-label="Branch state"
		data-testid="branch-context-filter"
	>
		<ChoiceItem value="active" label="Active" data-testid="filter-active">
			{#snippet leading()}
				<Stamp emphasis="ghost" border="none" background="transparent">
					<Icon icon="lucide:git-branch" width="14px" height="14px" />
				</Stamp>
			{/snippet}
			{#snippet trailing()}
				<Badge size="sm" emphasis="adaptive" data-testid="filter-active-count">{activeCount}</Badge>
			{/snippet}
		</ChoiceItem>

		<ChoiceItem value="deleted" label="Deleted" data-testid="filter-deleted">
			{#snippet leading()}
				<Stamp emphasis="ghost" border="none" background="transparent">
					<Icon icon="lucide:trash-2" width="14px" height="14px" />
				</Stamp>
			{/snippet}
			{#snippet trailing()}
				<Badge size="sm" emphasis="adaptive" feedback="danger" data-testid="filter-deleted-count">
					{deletedCount}
				</Badge>
			{/snippet}
		</ChoiceItem>
	</Choice>
{/key}
