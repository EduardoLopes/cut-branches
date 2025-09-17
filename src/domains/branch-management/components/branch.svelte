<script lang="ts">
	import Icon from '@iconify/svelte';
	import {
		getBranchColorPalette,
		getBranchAlerts,
		getBranchElementId,
		shouldShowBranchAlerts
	} from '../utils/branch-utils';
	import BranchAlerts from './branch-alerts.svelte';
	import CommitCard from './commit-card.svelte';
	import type { Branch } from '$services/common';
	import { formatString } from '$utils/string-utils';
	import { css } from '@pindoba/panda/css';

	interface Props {
		data: Branch;
		selected?: boolean;
		locked?: boolean;
		disabled?: boolean;
	}

	let { data, selected, locked, disabled }: Props = $props();

	const colorPalette = $derived(getBranchColorPalette(data, selected ?? false));
	const alerts = $derived(getBranchAlerts(data, selected ?? false));
	const showAlerts = $derived(shouldShowBranchAlerts(alerts, data));
</script>

<div
	id={getBranchElementId(data.name, 'container')}
	class={[
		colorPalette,
		css({
			display: 'flex',
			flexDirection: 'column',
			borderRadius: 'md',
			borderWidth: '1px',
			borderColor: 'colorPalette.400',
			colorPalette: 'neutral',
			p: 'md',
			gap: 'md',
			_light: {
				background: 'neutral.50'
			},
			_dark: {
				background: 'neutral.100'
			},
			'&.disabled, &.locked': {
				opacity: 0.5,
				pointerEvents: 'none',
				filter: 'grayscale(1)'
			},
			'&.selected': {
				borderColor: 'danger.800',
				borderStyle: 'dashed'
			},
			'&.current': {
				borderColor: 'primary.400'
			},
			pindobaTransition: 'fast'
		})
	]}
	class:disabled
	class:locked
	class:current={data.current}
	class:selected
	title={data.current ? 'Current branch' : formatString('{name}', { name: data.name })}
	data-selected={selected}
	data-testid={`branch-item-${data.name}`}
>
	<div
		class={[
			css({
				display: 'flex',
				flexDirection: 'column'
			}),
			selected &&
				css({
					color: 'danger.800'
				})
		]}
		id={getBranchElementId(data.name, 'title-container')}
	>
		<span
			class={css({
				fontWeight: 600,
				pindobaTransition: 'fast'
			})}
			data-testid="branch-name"
			id={getBranchElementId(data.name, 'name')}>{data.name}</span
		>
	</div>

	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			borderRadius: 'md'
		})}
		id={getBranchElementId(data.name, 'commit-container')}
	>
		<div
			class={css({
				fontSize: 'xs',
				textTransform: 'uppercase',
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 'xxs',
				pindobaTransition: 'fast',
				color: 'neutral.600',
				fontWeight: 'bold'
			})}
			id={getBranchElementId(data.name, 'commit-label')}
		>
			<Icon
				class={css({ color: 'neutral.800' })}
				icon="lucide:git-commit-horizontal"
				width="16px"
				height="16px"
				id={getBranchElementId(data.name, 'commit-icon')}
			/> Last commit
		</div>
		<CommitCard commit={data.lastCommit} deletedAt={data.deletedAt} />
	</div>

	{#if showAlerts}
		<BranchAlerts {alerts} branch={data} />
	{/if}
</div>
