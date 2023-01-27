<script lang="ts">
	import type { Hst } from '@histoire/plugin-svelte';
	import Button, { type ButtonFeedback, type ButtonSize, type ButtonState } from './index.svelte';
	export let Hst: Hst;

	let feedback: ButtonFeedback = 'normal';
	let feedbackOptions = [
		{ value: 'danger', label: 'danger' },
		{ value: 'info', label: 'info' },
		{ value: 'normal', label: 'normal' },
		{ value: 'success', label: 'success' },
		{ value: 'warning', label: 'warning' }
	];

	let size: ButtonSize = 'md';
	let sizeOptions = [
		{ value: 'sm', label: 'sm' },
		{ value: 'md', label: 'md' },
		{ value: 'lg', label: 'lg' }
	];

	// @ts-ignore
	let state: ButtonState = 'normal-1';
	let stateOptions = [
		{ value: 'normal-1', label: 'normal' },
		{ value: 'pressed', label: 'pressed' },
		{ value: 'disabled', label: 'disabled' },
		{ value: 'loading', label: 'loading' }
	];
</script>

<Hst.Story>
	<svelte:fragment slot="controls">
		<Hst.Radio bind:value={feedback} bind:options={feedbackOptions} title="Feedback" />
		<Hst.Radio bind:value={size} bind:options={sizeOptions} title="Size" />
		<Hst.Radio bind:value={state} bind:options={stateOptions} title="State" />
	</svelte:fragment>

	<Hst.Variant title="default variants">
		<Button {feedback} {size} {state}>Default</Button>
		<Button variant="secondary" {feedback} {size} {state}>Secondary</Button>
		<Button variant="tertiary" {feedback} {size} {state}>Tertiary</Button>
		<Button variant="ghost" {feedback} {size} {state}>Ghost</Button>
	</Hst.Variant>
</Hst.Story>
