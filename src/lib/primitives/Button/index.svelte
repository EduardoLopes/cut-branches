<script context="module" lang="ts">
	export type ButtonVariants = 'primary' | 'secondary' | 'tertiary' | 'ghost';

	export type ButtonSize = 'sm' | 'md' | 'lg';

	export type ButtonState = 'normal' | 'pressed' | 'disabled' | 'loading';

	export type ButtonFeedback = 'normal' | 'danger' | 'warning' | 'success' | 'info';

	export interface ButtonProps extends Omit<HTMLButtonAttributes, 'disabled'> {
		variant?: ButtonVariants;
		size?: ButtonSize;
		state?: ButtonState;
		feedback?: ButtonFeedback;
	}
</script>

<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import Renew from 'carbon-icons-svelte/lib/Renew.svelte';

	interface $$Props extends ButtonProps {}

	export let variant: $$Props['variant'] = 'primary';
	export let size: $$Props['size'] = 'md';
	export let state: $$Props['state'] = 'normal';
	export let feedback: $$Props['feedback'] = 'normal';
</script>

<button
	class="button variant-{variant} size-{size} state-{state} feedback-{feedback}"
	{...$$restProps}
	disabled={state === 'disabled'}
>
	<slot />
	{#if state === 'loading'}
		<div class="loading">
			<div class="icon">
				<Renew size="24" />
			</div>
		</div>
	{/if}
</button>

<style lang="scss">
	$feedbacks: 'danger', 'warning', 'success', 'info';

	@keyframes spin {
		0% {
			transform: rotate(360deg);
		}
		100% {
			transform: rotate(0);
		}
	}

	// vars
	.button {
		--button-background-color: var(--color-primary-3);
		--button-text-color: var(--color-neutral-1);
		--button-border-color: var(--button-background-color);
		--button-hover-background-color: var(--color-primary-3);
		--button-hover-border-color: var(--button-hover-background-color);
		--button-hover-text-color: var(--color-neutral-1);
		--button-active-background-color: var(--color-primary-2);
		--button-active-color: var(--color-primary-2);
		--button-disabled-background-color: var(--color-neutral-6);
		--button-disabled-border-color: var(--color-neutral-6);
		--button-disabled-text-color: var(--color-neutral-10);

		@each $feedback in $feedbacks {
			&.feedback-#{$feedback} {
				--button-background-color: var(--color-#{$feedback}-3);
				--button-hover-background-color: var(--color-#{$feedback}-4);
				--button-hover-text-color: var(--color-background-1);
				--button-active-background-color: var(--color-#{$feedback}-2);
				--button-disabled-background-color: var(--color-neutral-6);
				--button-disabled-border-color: var(--color-neutral-6);
				--button-disabled-text-color: var(--color-neutral-10);
			}
		}

		&.variant-secondary {
			--button-background-color: var(--color-background-1);
			--button-text-color: var(--color-primary-4);
			--button-disabled-background-color: var(--color-background-1);
			--button-border-color: var(--color-primary-3);

			@each $feedback in $feedbacks {
				&.feedback-#{$feedback} {
					--button-background-color: var(--color-background-1);
					--button-text-color: var(--color-#{$feedback}-4);
					--button-border-color: var(--color-#{$feedback}-3);
					--button-disabled-background-color: var(--color-background-1);
				}
			}
		}

		&.variant-tertiary {
			--button-background-color: var(--color-background-1);
			--button-text-color: var(--color-primary-4);
			--button-border-color: var(--color-background-1);
			--button-hover-background-color: var(--color-primary-3);
			--button-disabled-background-color: var(--color-background-1);
			--button-disabled-border-color: var(--color-background-1);

			&.state-pressed {
				border: 1px solid rgb(0 0 0 / 12%);
			}

			@each $feedback in $feedbacks {
				&.feedback-#{$feedback} {
					--button-background-color: var(--color-background-1);
					--button-text-color: var(--color-#{$feedback}-4);
					--button-border-color: var(--color-background-1);
					--button-disabled-background-color: var(--color-background-1);
					--button-hover-background-color: var(--color-#{$feedback}-3);
				}
			}
		}

		&.variant-ghost {
			--button-background-color: transparent;
			--button-text-color: var(--color-neutral-12);
			--button-border-color: transparent;
			--button-disabled-background-color: var(--color-background-1);
			--button-hover-background-color: transparent;
			--button-hover-text-color: var(--color-neutral-12);
			--button-active-background-color: transparent;
			--button-active-color: var(--color-background-1);
			--button-disabled-border-color: var(--color-background-1);
		}
	}

	// props
	.button {
		display: inline-flex;
		position: relative;
		transition-timing-function: ease-in-out;
		transition-duration: 0.1s;
		transition-property: width, height, border, color, background, padding, font-size;
		cursor: pointer;
		gap: 1rem;
		user-select: none;
		background: var(--button-background-color);
		color: var(--button-text-color);
		border-style: solid;
		border-width: 1px;
		border-color: var(--button-border-color);

		&:hover {
			background: var(--button-hover-background-color);
			color: var(--button-hover-text-color);
			border-color: var(--button-hover-border-color);
		}

		&:active {
			background: var(--button-active-background-color);
		}

		&:disabled {
			background: var(--button-disabled-background-color);
			border: solid 1px var(--button-disabled-border-color);
			color: var(--button-disabled-text-color);
			cursor: default;
		}

		&.size-sm {
			padding: 6px 14px;
			font-size: 0.8em;
		}

		&.size-md {
			padding: 8px 16px;
			font-size: 1em;
		}

		&.size-lg {
			padding: 10px 22px;
			font-size: 1.2rem;
		}

		&.state-pressed {
			box-shadow: inset 0 2px 4px 0px rgb(0 0 0 / 25%);
		}

		&.state-loading {
			pointer-events: none;

			.loading {
				display: flex;
				align-items: center;
				justify-content: center;
				position: absolute;
				inset: 0;
				backdrop-filter: blur(6px);
				background: rgba(255 255 255 / 10%);

				.icon {
					width: 24px;
					height: 24px;
					animation: spin 1s linear infinite;
				}
			}
		}

		&.variant-tertiary {
			&.state-pressed {
				border: 1px solid rgb(0 0 0 / 12%);
			}
		}
	}
</style>
