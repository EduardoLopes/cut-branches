<script lang="ts">
	import Icon from '@iconify/svelte';
	import { css } from '@pindoba/styled-system/css';
	import Alert from '@pindoba/svelte-alert';
	import Group from '@pindoba/svelte-group';
	import { getBranchElementId } from '../utils/branch-utils';
	import type { Branch } from '$lib/bindings';
	import { formatString } from '$utils/string-utils';

	interface Props {
		alerts: string[];
		branch: Branch;
	}

	let { alerts, branch }: Props = $props();
</script>

<Group direction="vertical" noBorder id={getBranchElementId(branch.name, 'alerts-group')}>
	{#each alerts as alert (alert)}
		{#if alert === 'fullyMerged' && !branch.current}
			<Alert id={getBranchElementId(branch.name, `alert-${alert}`)}>
				<div class={css({ display: 'flex', gap: 'xs', alignItems: 'center' })}>
					<Icon icon="lucide:info" />
					<span>This branch is not fully merged into the current branch!</span>
				</div>
			</Alert>
		{:else if alert === 'protectedWords'}
			<Alert
				id={getBranchElementId(branch.name, `alert-${alert}`)}
				data-testid="protected-words-alert"
				feedback="danger"
			>
				<div class={css({ display: 'flex', gap: 'xs', alignItems: 'center' })}>
					<Icon icon="lucide:alert-triangle" />
					<span>
						{formatString('This branch contains protected words ({name})', {
							name: branch.name
						})}
					</span>
				</div>
			</Alert>
		{:else if alert === 'offensiveWords'}
			<Alert
				id={getBranchElementId(branch.name, `alert-${alert}`)}
				data-testid="offensive-words-alert"
				feedback="warning"
			>
				<div class={css({ display: 'flex', gap: 'xs', alignItems: 'center' })}>
					<Icon icon="lucide:info" />
					<span>
						This branch contains potentially offensive words (e.g. 'master'). Consider renaming it
						to align with inclusive terminology.
					</span>
				</div>
			</Alert>
		{/if}
	{/each}
</Group>
