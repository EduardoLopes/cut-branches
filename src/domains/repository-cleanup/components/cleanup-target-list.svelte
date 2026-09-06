<script lang="ts">
	import Badge from '@pindoba/svelte-badge';
	import type { CleanupTarget } from '$infrastructure/bindings';
	import TruncatedPath from '$ui/core/truncated-path.svelte';
	import SelectionRow from '$ui/patterns/selection-row.svelte';
	import { formatBytes } from '$utils/format-bytes';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		targets: CleanupTarget[];
		isSelected: (path: string) => boolean;
		onToggle: (path: string) => void;
	}

	let { targets, isSelected, onToggle }: Props = $props();
</script>

<!--
	Just the rows: the host decides how they scroll (the cleanup modal puts them
	in a ScrollWell, the bulk view in an accordion). One line per folder — the
	name leads, the path truncates in the middle with the folder highlighted so
	it lands in the same column on every row — and the size pins to the end.
-->
<div
	class={css({ display: 'flex', flexDirection: 'column', gap: '3xs' })}
	data-testid="cleanup-target-list"
>
	{#each targets as target (target.path)}
		<SelectionRow
			checked={isSelected(target.path)}
			onchange={() => onToggle(target.path)}
			ariaLabel={target.folderName}
			testId="cleanup-target"
		>
			<span class={css({ display: 'flex', alignItems: 'center', gap: 'md', minWidth: '0' })}>
				<span class={css({ fontSize: 'sm', fontWeight: 'medium', flexShrink: '0' })}>
					{target.folderName}
				</span>
				<TruncatedPath
					path={target.path}
					highlight={target.folderName}
					align="end"
					class={css({ flex: '1', maxWidth: '60%', marginLeft: 'auto', fontSize: 'xs' })}
					data-testid="cleanup-target-path"
				/>
			</span>
			{#snippet trailing()}
				<Badge size="sm" emphasis="adaptive" data-testid="cleanup-target-size">
					{formatBytes(target.sizeBytes)}
				</Badge>
			{/snippet}
		</SelectionRow>
	{/each}
</div>
