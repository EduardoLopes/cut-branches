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
	@mixin feedback-primary($type) {
		&.feedback-#{$type} {
			background: var(--color-#{$type}-3);
			border-color: var(--color-#{$type}-3);
			&:hover {
				background: var(--color-#{$type}-4);
				color: var(--color-background-1);
			}

			&:active {
				background: var(--color-#{$type}-2);
			}

			&:disabled {
				background: var(--color-background-1);
				border-style: var(--color-neutral-8);
				color: var(--color-neutral-10);
			}
		}
	}

	@mixin feedback-secondary($type) {
		&.feedback-#{$type} {
			background: var(--color-background-1);
			color: var(--color-#{$type}-4);
		}
	}

	@mixin feedback-tertiary($type) {
		&.feedback-#{$type} {
			background: var(--color-background-1);
			border-color: var(--color-background-1);
			color: var(--color-#{$type}-4);

			&:hover {
				border-color: var(--color-#{$type}-4);
			}
		}
	}

	@keyframes spin {
		0% {
			transform: rotate(360deg);
		}
		100% {
			transform: rotate(0);
		}
	}

	.button {
		display: inline-flex;
		position: relative;
		transition: all 0.1s ease-in-out;
		cursor: pointer;
		text-align: center;
		text-decoration: none;
		vertical-align: middle;
		border: none;
		gap: 1rem;
		user-select: none;

		&.variant-primary {
			background: var(--color-primary-3);
			color: #fff;
			border: solid 1px var(--color-primary-3);
			&:hover {
				background: var(--color-primary-4);
				color: #fff;
			}

			&:active {
				background: var(--color-primary-2);
			}

			&:disabled {
				background: var(--color-neutral-6);
				border: solid 1px var(--color-neutral-6);
				color: var(--color-neutral-10);
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

			@include feedback-primary('danger');
			@include feedback-primary('warning');
			@include feedback-primary('success');
			@include feedback-primary('info');
		}

		&.variant-secondary {
			@extend .variant-primary;
			background: var(--color-background-1);
			color: var(--color-primary-4);
			border: solid 1px var(--color-primary-3);

			&:disabled {
				background: var(--color-background-1);
				border: solid 1px var(--color-neutral-6);
			}

			@include feedback-secondary('danger');
			@include feedback-secondary('warning');
			@include feedback-secondary('success');
			@include feedback-secondary('info');
		}

		&.variant-tertiary {
			@extend .variant-primary;
			background: var(--color-background-1);
			color: var(--color-primary-4);
			border: 1px solid var(--color-background-1);

			&:disabled {
				background: var(--color-background-1);
				border: 1px solid var(--color-background-1);
			}

			&.state-pressed {
				border: 1px solid rgb(0 0 0 / 12%);
			}

			@include feedback-tertiary('danger');
			@include feedback-tertiary('warning');
			@include feedback-tertiary('success');
			@include feedback-tertiary('info');
		}

		&.variant-ghost {
			background: transparent;
		}
	}
</style>
