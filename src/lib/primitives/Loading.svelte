<script context="module" lang="ts">
	export type LoadingVariant = 'primary' | 'secondary';
	export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';
	export type LoadingState = 'normal' | 'loading';

	export type LoadingFeedback = 'normal' | 'danger' | 'warning' | 'success' | 'info';

	export interface LoadingProps {
		variant?: LoadingVariant;
		size?: LoadingSize;
		feedback?: LoadingFeedback;
		state?: LoadingState;
	}
</script>

<script lang="ts">
	import Icon from '@iconify/svelte';
	import { blur } from 'svelte/transition';
	import { expoOut } from 'svelte/easing';

	type $$Props = LoadingProps;

	export let variant: $$Props['variant'] = 'secondary';
	export let size: $$Props['size'] = 'xxl';
	export let feedback: $$Props['feedback'] = 'normal';
	export let state: LoadingState = 'normal';
</script>

<div class="loading-container size-{size} feedback-{feedback} variant-{variant} state-{state}">
	<div class="content">
		<slot />
	</div>
	{#if state === 'loading'}
		<div
			class="icon-container"
			in:blur|local={{ duration: 350, easing: expoOut }}
			out:blur|local={{ duration: 350, easing: expoOut }}
		>
			<div class="overlay" />
			<div class="icon">
				<Icon icon="mingcute:loading-line" width="100%" height="100%" />
			</div>
		</div>
	{/if}
</div>

<style lang="scss">
	@keyframes spin {
		0% {
			transform: rotate(0);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.loading-container {
		--loading-background-color: var(--color-neutral-3);
		--loading-size: var(--space-md);
		--loading-icon-color: var(--color-primary-3);

		$feedbacks: 'danger', 'warning', 'success', 'info', 'normal';

		@each $feedback in $feedbacks {
			&.feedback-#{$feedback} {
				@if $feedback == 'normal' {
					$feedback: 'primary';
				}

				--loading-background-color: var(--color-#{$feedback}-2);
				--loading-icon-color: var(--color-#{$feedback}-6);
			}
		}

		&.size-sm {
			--loading-size: var(--space-sm);
		}

		&.size-md {
			--loading-size: var(--space-md);
		}

		&.size-lg {
			--loading-size: var(--space-lg);
		}

		&.size-xl {
			--loading-size: var(--space-xl);
		}

		&.size-xxl {
			--loading-size: var(--space-xxl);
		}

		&.size-xxxl {
			--loading-size: var(--space-xxxl);
		}
	}

	.loading-container {
		height: 100%;
		position: relative;
		z-index: 100;
		min-width: var(--loading-size);
		min-height: var(--loading-size);
		border-radius: 4px;
		overflow: hidden;

		.content {
			height: 100%;
		}

		&.variant-primary {
			.overlay {
				border: 1px solid var(--loading-icon-color);
			}
		}

		&.variant-secondary {
			border: none;

			.icon-container .overlay {
				&::after {
					background: var(--color-neutral-2);
				}
			}
		}

		&.state-loading .content {
			opacity: 0.8;
			user-select: none;
			pointer-events: none;
		}

		.icon-container {
			position: relative;
			display: grid;
			place-items: center;
			position: absolute;
			inset: 0;
			height: 100%;
			border-radius: 4px;
			z-index: 9;

			.overlay {
				position: relative;
				display: grid;
				place-items: center;
				position: absolute;
				inset: 0;
				-webkit-backdrop-filter: blur(2px);
				backdrop-filter: blur(2px);
				border-radius: 4px;

				&::after {
					content: '';
					position: absolute;
					inset: 0;
					opacity: 0.4;
					background: var(--loading-background-color);
					border-radius: 4px;
					height: 100%;
				}
			}

			.icon {
				display: grid;
				place-items: center;
				width: var(--loading-size);
				height: var(--loading-size);
				animation: spin 1s linear infinite;
				color: var(--loading-icon-color);
				z-index: 100;
			}
		}
	}
</style>
