<script lang="ts">
	import Badge from '@pindoba/svelte-badge';
	import { getBranchElementId } from '../utils/branch-utils';
	import { type Branch } from '$domains/branch-management/core/models/branch';
	import { formatString } from '$utils/string-utils';

	interface Props {
		/** Alert keys from `getBranchAlerts`. */
		alerts: string[];
		branch: Branch;
	}

	let { alerts, branch }: Props = $props();
</script>

<!-- Inline badges, sized to sit on a list row's second line: the short word
     says what's wrong, the title says the rest. -->
{#each alerts as alert (alert)}
	{#if alert === 'fullyMerged' && !branch.isCurrent()}
		<Badge
			size="sm"
			tone="warning"
			emphasis="secondary"
			id={getBranchElementId(branch.getName(), `alert-${alert}`)}
			title="This branch is not fully merged into the current branch"
			data-testid="branch-alert-not-merged"
		>
			not merged
		</Badge>
	{:else if alert === 'protectedWords'}
		<Badge
			size="sm"
			tone="danger"
			id={getBranchElementId(branch.getName(), `alert-${alert}`)}
			title={formatString('This branch contains protected words ({name})', {
				name: branch.getName()
			})}
			data-testid="protected-words-alert"
		>
			protected
		</Badge>
	{:else if alert === 'offensiveWords'}
		<Badge
			size="sm"
			tone="warning"
			id={getBranchElementId(branch.getName(), `alert-${alert}`)}
			title="This branch contains potentially offensive words (e.g. 'master'). Consider renaming it to align with inclusive terminology."
			data-testid="offensive-words-alert"
		>
			offensive name
		</Badge>
	{/if}
{/each}
