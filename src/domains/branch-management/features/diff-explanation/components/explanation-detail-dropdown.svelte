<script lang="ts">
	// A compact per-file override for the explanation granularity, sitting next
	// to a file's Explain button. It starts from the global "Detail" setting but
	// lets one file be explained per-change while another stays whole-file.
	// Pure delivery-layer UI — the owner holds the effective value and gets the
	// choice via `onChange`.
	import Icon from '@iconify/svelte';
	import type { MenuNode } from '@pindoba/core-menu';
	import Button from '@pindoba/svelte-button';
	import Menu from '@pindoba/svelte-menu';
	import Stamp from '@pindoba/svelte-stamp';
	import type { ExplanationDetail } from '../../branch-diff/application/use-diff-view-options.svelte';

	interface Props {
		/** The effective detail for this file (per-file override or the global). */
		detail: ExplanationDetail;
		onChange: (detail: ExplanationDetail) => void;
	}

	let { detail, onChange }: Props = $props();

	const menuItems = $derived<MenuNode[]>([
		{
			type: 'radiogroup',
			id: 'explanation-file-detail',
			label: 'Explain this file as',
			value: detail,
			items: [
				{ type: 'radio', id: 'explanation-file-detail-file', label: 'Whole file', value: 'file' },
				{
					type: 'radio',
					id: 'explanation-file-detail-hunks',
					label: 'Per change',
					value: 'hunks'
				}
			],
			// The radiogroup only ever emits one of its item values.
			onValueChange: (value: string) => onChange(value as ExplanationDetail)
		}
	]);
</script>

<Menu placement="bottom-end" aria-label="Explanation detail for this file" items={menuItems}>
	{#snippet trigger(triggerProps)}
		<Button
			emphasis="ghost"
			size="xs"
			shape="square"
			aria-label="Choose explanation detail for this file"
			title="Explain this file: whole file or per change"
			data-testid="explanation-detail-trigger"
			{...triggerProps}
		>
			<Stamp emphasis="ghost" border="none" background="transparent">
				<Icon icon="lucide:chevron-down" width="14px" height="14px" />
			</Stamp>
		</Button>
	{/snippet}
</Menu>
