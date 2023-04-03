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

	type $$Props = ButtonProps;

	export let variant: $$Props['variant'] = 'primary';
	export let size: $$Props['size'] = 'md';
	export let state: $$Props['state'] = 'normal';
	export let feedback: $$Props['feedback'] = 'normal';
</script>

<button
	class="button variant-{variant} size-{size} state-{state} feedback-{feedback}"
	{...$$restProps}
	on:click
	on:mouseover
	on:mouseenter
	on:mouseleave
	on:focus
	disabled={state === 'disabled'}
>
	<slot />
	{#if state === 'loading'}
		<div class="loading">
			<div class="icon">
				<Renew />
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
		//default
		--button-background-color: var(--color-primary-3);
		--button-text-color: var(--color-neutral-1);
		--button-border-color: var(--button-background-color);

		//hover
		--button-hover-background-color: var(--color-primary-4);
		--button-hover-text-color: var(--color-neutral-1);
		--button-hover-border-color: var(--button-hover-background-color);

		//active
		--button-active-background-color: var(--color-primary-2);
		--button-active-text-color: var(--color-neutral-1);
		--button-active-border-color: var(--button-active-background-color);

		//focus
		--button-focus-background-color: var(--button-hover-background-color);
		--button-focus-text-color: var(--button-hover-text-color);
		--button-focus-border-color: var(--button-hover-border-color);

		//disabled
		--button-disabled-background-color: var(--color-neutral-6);
		--button-disabled-border-color: var(--color-neutral-6);
		--button-disabled-text-color: var(--color-neutral-10);

		// font-size
		--button-font-size-sm: var(--font-size-sm);
		--button-font-size-md: var(--font-size-md);
		--button-font-size-lg: var(--font-size-lg);

		// padding
		--button-padding-sm: var(--space-xs) var(--space-sm);
		--button-padding-md: var(--space-sm) var(--space-md);
		--button-padding-lg: var(--space-md) var(--space-lg);

		// border radius
		--button-border-top-left-radius: var(--border-radius-md);
		--button-border-top-right-radius: var(--border-radius-md);
		--button-border-bottom-left-radius: var(--border-radius-md);
		--button-border-bottom-right-radius: var(--border-radius-md);

		@each $feedback in $feedbacks {
			&.feedback-#{$feedback} {
				//default
				--button-background-color: var(--color-#{$feedback}-3);

				//hover
				--button-hover-background-color: var(--color-#{$feedback}-4);
				--button-hover-text-color: var(--color-background-1);

				//acitve
				--button-active-background-color: var(--color-#{$feedback}-2);

				//disabled
				--button-disabled-background-color: var(--color-neutral-6);
				--button-disabled-border-color: var(--color-neutral-6);
				--button-disabled-text-color: var(--color-neutral-10);
			}
		}

		&.variant-secondary {
			//default
			--button-background-color: var(--color-background-1);
			--button-text-color: var(--color-primary-4);
			--button-border-color: var(--color-primary-3);

			//disabled
			--button-disabled-background-color: var(--color-background-1);

			@each $feedback in $feedbacks {
				&.feedback-#{$feedback} {
					//default
					--button-background-color: var(--color-background-1);
					--button-text-color: var(--color-#{$feedback}-4);
					--button-border-color: var(--color-#{$feedback}-3);

					//disabled
					--button-disabled-background-color: var(--color-background-1);
				}
			}
		}

		&.variant-tertiary {
			//default
			--button-background-color: var(--color-background-1);
			--button-text-color: var(--color-primary-4);
			--button-border-color: var(--color-background-1);

			// disabled
			--button-disabled-background-color: var(--color-background-1);

			&.state-pressed {
				border: 1px solid rgb(0 0 0 / 12%);
			}

			@each $feedback in $feedbacks {
				&.feedback-#{$feedback} {
					// default
					--button-background-color: var(--color-background-1);
					--button-text-color: var(--color-#{$feedback}-4);
					--button-border-color: var(--color-background-1);

					// hover
					--button-hover-background-color: var(--color-#{$feedback}-4);

					// disabled
					--button-disabled-background-color: var(--color-background-1);
					--button-disabled-border-color: var(--color-background-1);
				}
			}
		}

		&.variant-ghost {
			// default
			--button-background-color: transparent;
			--button-text-color: normal;
			--button-border-color: transparent;

			// hover
			--button-hover-background-color: transparent;
			--button-hover-text-color: normal;

			// active
			--button-active-background-color: transparent;
			--button-active-text-color: var(--button-hover-text-color);
			--button-active-border-color: var(--color-background-1);

			// disabled
			--button-disabled-background-color: var(--color-background-1);
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
		margin: 0;

		border-top-left-radius: var(--button-border-top-left-radius);
		border-top-right-radius: var(--button-border-top-right-radius);
		border-bottom-left-radius: var(--button-border-bottom-left-radius);
		border-bottom-right-radius: var(--button-border-bottom-right-radius);

		&:hover {
			background: var(--button-hover-background-color);
			color: var(--button-hover-text-color);
			border-color: var(--button-hover-border-color);
		}

		&:active {
			background: var(--button-active-background-color);
			color: var(--button-active-text-color);
			border-color: var(--button-active-border-color);
		}

		&:focus-visible {
			background: var(--button-focus-background-color);
			color: var(--button-focus-text-color);
			border-color: var(--button-focus-border-color);
		}

		&:disabled {
			background: var(--button-disabled-background-color);
			color: var(--button-disabled-text-color);
			border-color: var(--button-disabled-border-color);
			cursor: default;
		}

		&.size-sm {
			padding: var(--button-padding-sm);
			font-size: var(--button-font-size-sm);
		}

		&.size-md {
			padding: var(--button-padding-md);
			font-size: var(--button-font-size-md);
		}

		&.size-lg {
			padding: var(--button-padding-lg);
			font-size: var(--button-font-size-lg);
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

		&.variant-tertiary,
		&.variant-ghost {
			&.state-pressed {
				border: 1px solid rgb(0 0 0 / 12%);
			}
		}
	}
</style>
