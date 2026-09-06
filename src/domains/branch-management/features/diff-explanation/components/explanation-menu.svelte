<script lang="ts">
	// Header dropdown for the AI explanation settings, chosen up front so the
	// first Explain click runs the intended mode:
	//   • Style  — verbosity / focus (succinct, detailed, review, plain).
	//   • Detail — whole-file summary vs inline per-change-group explanations.
	// Pure delivery-layer UI — the owner holds the persisted options and gets
	// changes via the callbacks. Applies to per-file Explain and Explain-all.
	import Icon from '@iconify/svelte';
	import type { MenuNode } from '@pindoba/core-menu';
	import Button from '@pindoba/svelte-button';
	import Menu from '@pindoba/svelte-menu';
	import Stamp from '@pindoba/svelte-stamp';
	import type { ExplanationDetail } from '../../branch-diff/application/use-diff-view-options.svelte';
	import type { ExplanationStyle } from '$infrastructure/bindings';

	interface Props {
		style: ExplanationStyle;
		detail: ExplanationDetail;
		onStyleChange: (style: ExplanationStyle) => void;
		onDetailChange: (detail: ExplanationDetail) => void;
	}

	let { style, detail, onStyleChange, onDetailChange }: Props = $props();

	const menuItems = $derived<MenuNode[]>([
		{
			type: 'radiogroup',
			id: 'explanation-detail',
			label: 'Detail',
			value: detail,
			items: [
				{ type: 'radio', id: 'explanation-detail-file', label: 'Whole file', value: 'file' },
				{ type: 'radio', id: 'explanation-detail-hunks', label: 'Per change', value: 'hunks' }
			],
			// The radiogroup only ever emits one of its item values.
			onValueChange: (value: string) => onDetailChange(value as ExplanationDetail)
		},
		{ type: 'separator', id: 'explanation-menu-separator' },
		{
			type: 'radiogroup',
			id: 'explanation-style',
			label: 'Style',
			value: style,
			items: [
				{ type: 'radio', id: 'explanation-style-succinct', label: 'Succinct', value: 'succinct' },
				{ type: 'radio', id: 'explanation-style-detailed', label: 'Detailed', value: 'detailed' },
				{
					type: 'radio',
					id: 'explanation-style-review',
					label: 'Review-focused',
					value: 'reviewFocused'
				},
				{
					type: 'radio',
					id: 'explanation-style-plain',
					label: 'Plain-language',
					value: 'plainLanguage'
				}
			],
			onValueChange: (value: string) => onStyleChange(value as ExplanationStyle)
		}
	]);
</script>

<Menu placement="bottom-end" aria-label="Explanation settings" items={menuItems}>
	{#snippet trigger(triggerProps)}
		<Button
			emphasis="ghost"
			size="sm"
			aria-label="Explanation settings"
			data-testid="explanation-menu-trigger"
			{...triggerProps}
		>
			{#snippet leading()}
				<Stamp emphasis="ghost" border="none" background="transparent">
					<Icon icon="lucide:sparkles" width="16px" height="16px" />
				</Stamp>
			{/snippet}
			Explanation
		</Button>
	{/snippet}
</Menu>
