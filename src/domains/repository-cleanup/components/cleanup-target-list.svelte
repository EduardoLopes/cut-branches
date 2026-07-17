<script lang="ts">
	import Badge from '@pindoba/svelte-badge';
	import Banner, { type BannerProps } from '@pindoba/svelte-banner';
	import Checkbox from '@pindoba/svelte-checkbox';
	import type { CleanupTarget } from '$infrastructure/bindings';
	import { formatBytes } from '$utils/format-bytes';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		targets: CleanupTarget[];
		isSelected: (path: string) => boolean;
		onToggle: (path: string) => void;
	}

	let { targets, isSelected, onToggle }: Props = $props();
</script>

<div
	class={css({
		display: 'flex',
		flexDirection: 'column',
		gap: '3xs',
		overflowY: 'auto',
		padding: '2xs'
	})}
	data-testid="cleanup-target-list"
>
	{#each targets as target (target.path)}
		{@const selected = isSelected(target.path)}
		{#snippet sizeBadge()}
			<Badge size="sm" emphasis="adaptive" data-testid="cleanup-target-size">
				{formatBytes(target.sizeBytes)}
			</Badge>
		{/snippet}
		<Checkbox
			fullWidth
			checked={selected}
			onchange={() => onToggle(target.path)}
			aria-label={target.folderName}
			data-testid="cleanup-target"
			passThrough={{ text: { style: css.raw({ flex: '1', minWidth: '0' }) } }}
			class={css({
				alignItems: 'flex-start',
				borderRadius: 'md',
				paddingX: 'xs',
				paddingY: 'xs',
				background: selected ? 'neutral.surface.step.3' : 'neutral.surface.step.2',
				_hover: { background: 'neutral.surface.step.3' }
			})}
		>
			<Banner
				size="sm"
				heading={target.folderName}
				subheading={target.path}
				trailing={sizeBadge as BannerProps['trailing']}
				layout={{ trailing: { align: 'center' } }}
				passThrough={{
					root: { style: css.raw({ width: '100%' }) },
					headingGroup: { style: css.raw({ minWidth: '0' }) },
					subheadingContainer: {
						style: css.raw({ minWidth: '0', alignSelf: 'stretch' })
					},
					subheading: {
						style: css.raw({
							display: 'block',
							minWidth: '0',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap'
						})
					},
					trailing: { style: css.raw({ flexShrink: '0' }) }
				}}
			/>
		</Checkbox>
	{/each}
</div>
