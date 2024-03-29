<script context="module" lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	export interface CheckboxProps extends HTMLInputAttributes {
		indeterminate?: boolean;
		visuallyHideLabel?: boolean;
	}
</script>

<script lang="ts">
	type $$Props = CheckboxProps;

	export let indeterminate = false;
	export let visuallyHideLabel = false;
</script>

<label class="label">
	<input
		type="checkbox"
		name="checkbox"
		bind:indeterminate
		aria-checked={indeterminate ? 'mixed' : undefined}
		{...$$restProps}
		on:click
		on:change
		on:mouseover
		on:mouseenter
		on:mouseleave
		on:focus
	/>
	<span class:visually-hide-label={visuallyHideLabel}>
		<slot />
	</span>
</label>

<style lang="scss">
	.transition {
		transition-timing-function: ease-in-out;
		transition-duration: 0.1s;
		transition-property: width, height, border, color, background, padding, font-size;
	}

	.visually-hide-label {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	.label {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		cursor: pointer;
		width: max-content;

		@extend .transition;

		&:has(input[disabled], input[aria-disabled='true']) {
			opacity: 0.5;
			cursor: default;

			&:hover {
				color: inherit;
			}
		}

		&:hover {
			// color: var(--color-primary-7);
			input[type='checkbox']:not(:disabled) {
				border-color: var(--color-primary-7);
			}

			input[type='checkbox']:checked:not(:disabled) {
				background-color: var(--color-primary-7);
				border-color: var(--color-primary-7);
			}
		}

		&:active {
			// color: var(--color-primary-7);
			input[type='checkbox']:not(:disabled) {
				border-color: var(--color-primary-8);
			}

			input[type='checkbox']:checked:not(:disabled) {
				background-color: var(--color-primary-8);
				border-color: var(--color-primary-8);
			}
		}

		input[type='checkbox'] {
			position: relative;
			-webkit-appearance: none;
			appearance: none;
			height: 1.4em;
			width: 1.4em;
			border-radius: 4px;
			background: #fff;
			border: 1px solid var(--color-neutral-6);
			cursor: pointer;

			@extend .transition;

			&[disabled],
			&[aria-disabled='true'] {
				opacity: 0.5;
				cursor: default;
			}

			&::before {
				content: '';
				position: absolute;
				margin: auto;
				left: 0;
				right: 0;
				bottom: 0;
				overflow: hidden;
				top: 0;
			}

			&:focus {
				outline: 2px solid;
				outline-offset: 2px;
			}
		}

		input[type='checkbox']:indeterminate::before,
		input[type='checkbox'][aria-checked='mixed']::before {
			border: 2px solid var(--color-primary-6);
			height: 0;
			width: 40%;
		}

		input[type='checkbox'][aria-checked='mixed'] {
			border-color: var(--color-primary-6);
		}

		input[type='checkbox']:checked::before {
			border-right: 3px solid var(--color-neutral-1);
			border-bottom: 3px solid var(--color-neutral-1);
			height: 45%;
			width: 20%;
			transform: rotate(45deg) translateY(-7%) translateX(-10%);
		}

		input[type='checkbox']:checked {
			background-color: var(--color-primary-6);
			border-color: var(--color-primary-6);
		}
	}
</style>
