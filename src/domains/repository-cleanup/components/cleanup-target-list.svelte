<script lang="ts">
	import Badge from '@pindoba/svelte-badge';
	import Banner, { type BannerProps } from '@pindoba/svelte-banner';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Panel from '@pindoba/svelte-panel';
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

<!--
	The scroller is a transparent Panel rather than a plain div so it counts as a
	nesting level in the concentric-radius cascade: it republishes the enclosing
	well's radius minus this inset, which is what lets the rows below ask for
	`radius="inner"` and come out right in every host (the cleanup modal's `lg`
	well and the bulk view's `xl` well both work with no per-host tuning).
-->
<Panel
	background="transparent"
	border="none"
	radius="inner"
	padding="2xs"
	class={css({
		display: 'flex',
		flexDirection: 'column',
		gap: '3xs',
		overflowY: 'auto'
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
			radius="inner"
			passThrough={{ text: { style: css.raw({ flex: '1', minWidth: '0' }) } }}
			class={css({
				alignItems: 'flex-start',
				paddingX: 'xs',
				paddingY: 'xs',
				background: selected ? 'neutral.surface.valley' : 'neutral.surface.base',
				_hover: { background: 'neutral.surface.valley' }
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
</Panel>
