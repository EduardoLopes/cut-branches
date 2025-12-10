<script lang="ts">
	import Alert from '@pindoba/svelte-alert';
	import Group from '@pindoba/svelte-group';
	import { getBranchElementId } from '../utils/branch-utils';
	import { type Branch } from '$domains/branch-management/core/models/branch';
	import { formatString } from '$utils/string-utils';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		alerts: string[];
		branch: Branch;
	}

	let { alerts, branch }: Props = $props();
</script>

<Group direction="vertical" id={getBranchElementId(branch.getName(), 'alerts-group')}>
	{#each alerts as alert (alert)}
		{#if alert === 'fullyMerged' && !branch.isCurrent()}
			<Alert id={getBranchElementId(branch.getName(), `alert-${alert}`)}>
				<div class={css({ display: 'flex', gap: 'xs', alignItems: 'center' })}>
					<span>This branch is not fully merged into the current branch!</span>
				</div>
			</Alert>
		{:else if alert === 'protectedWords'}
			<Alert
				id={getBranchElementId(branch.getName(), `alert-${alert}`)}
				data-testid="protected-words-alert"
				feedback="danger"
			>
				<div class={css({ display: 'flex', gap: 'xs', alignItems: 'center' })}>
					<span>
						{formatString('This branch contains protected words ({name})', {
							name: branch.getName()
						})}
					</span>
				</div>
			</Alert>
		{:else if alert === 'offensiveWords'}
			<Alert
				id={getBranchElementId(branch.getName(), `alert-${alert}`)}
				data-testid="offensive-words-alert"
				feedback="warning"
			>
				<div class={css({ display: 'flex', gap: 'xs', alignItems: 'center' })}>
					<span>
						This branch contains potentially offensive words (e.g. 'master'). Consider renaming it
						to align with inclusive terminology.
					</span>
				</div>
			</Alert>
		{/if}
	{/each}
</Group>
