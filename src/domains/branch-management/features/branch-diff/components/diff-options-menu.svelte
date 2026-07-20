<script lang="ts">
	// Compact presentation controls for the diff list, folded into a single
	// header dropdown: layout (unified/split), change style (background wash /
	// +− markers / edge bars), line numbers (one or two columns) and line
	// wrapping. Pure delivery-layer UI — the owner holds the option state and
	// receives changes via `onChange`.
	import Icon from '@iconify/svelte';
	import type { MenuNode } from '@pindoba/core-menu';
	import Button from '@pindoba/svelte-button';
	import Menu from '@pindoba/svelte-menu';
	import Stamp from '@pindoba/svelte-stamp';
	import type { DiffViewOptions } from '../application/use-diff-view-options.svelte';
	import type {
		DiffViewerGutter,
		DiffViewerLayout,
		DiffViewerVariant
	} from '$ui/patterns/diff-viewer/types';

	interface Props {
		options: DiffViewOptions;
		onChange: (partial: Partial<DiffViewOptions>) => void;
	}

	let { options, onChange }: Props = $props();

	// The Choice-style radiogroups only ever emit their items' values, so the
	// casts below are safe.
	const menuItems = $derived.by<MenuNode[]>(() => {
		const items: MenuNode[] = [
			{
				type: 'radiogroup',
				id: 'diff-layout',
				label: 'Layout',
				value: options.layout,
				items: [
					{ type: 'radio', id: 'diff-layout-unified', label: 'Unified', value: 'unified' },
					{ type: 'radio', id: 'diff-layout-split', label: 'Split', value: 'split' }
				],
				onValueChange: (value: string) => onChange({ layout: value as DiffViewerLayout })
			},
			{ type: 'separator', id: 'diff-style-separator' },
			{
				type: 'radiogroup',
				id: 'diff-style',
				label: 'Style',
				value: options.variant,
				items: [
					{ type: 'radio', id: 'diff-style-background', label: 'Background', value: 'background' },
					{ type: 'radio', id: 'diff-style-markers', label: 'Markers', value: 'markers' },
					{ type: 'radio', id: 'diff-style-bars', label: 'Bars', value: 'bars' }
				],
				onValueChange: (value: string) => onChange({ variant: value as DiffViewerVariant })
			}
		];

		// The two-column gutter only applies to the unified layout — split
		// already shows each side's own number.
		if (options.layout === 'unified') {
			items.push(
				{ type: 'separator', id: 'diff-gutter-separator' },
				{
					type: 'radiogroup',
					id: 'diff-gutter',
					label: 'Line numbers',
					value: options.gutter,
					items: [
						{ type: 'radio', id: 'diff-gutter-single', label: 'Single column', value: 'single' },
						{ type: 'radio', id: 'diff-gutter-double', label: 'Old / new', value: 'double' }
					],
					onValueChange: (value: string) => onChange({ gutter: value as DiffViewerGutter })
				}
			);
		}

		items.push(
			{ type: 'separator', id: 'diff-wrap-separator' },
			{
				type: 'checkbox',
				id: 'diff-wrap',
				label: 'Wrap lines',
				checked: options.wrap,
				onCheckedChange: (checked: boolean) => onChange({ wrap: checked })
			}
		);

		return items;
	});
</script>

<Menu placement="bottom-end" aria-label="Diff view options" items={menuItems}>
	{#snippet trigger(triggerProps)}
		<Button
			emphasis="ghost"
			size="sm"
			aria-label="Diff view options"
			data-testid="diff-options-trigger"
			{...triggerProps}
		>
			{#snippet leading()}
				<Stamp emphasis="ghost" border="none" background="transparent">
					<Icon icon="lucide:sliders-horizontal" width="16px" height="16px" />
				</Stamp>
			{/snippet}
			View
		</Button>
	{/snippet}
</Menu>
