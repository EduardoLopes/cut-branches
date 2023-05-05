<script context="module" lang="ts">
	export type AlertVariants = 'primary' | 'secondary';

	export type AlertSize = 'sm' | 'md' | 'lg';

	export type AlertFeedback = 'normal' | 'danger' | 'warning' | 'success' | 'info';

	export interface AlertProps {
		variant?: AlertVariants;
		size?: AlertSize;
		feedback?: AlertFeedback;
		showIcon?: boolean;
	}
</script>

<script lang="ts">
	import Icon from '@iconify/svelte';

	type $$Props = AlertProps;

	export let variant: $$Props['variant'] = 'primary';
	export let size: $$Props['size'] = 'md';
	export let feedback: $$Props['feedback'] = 'normal';
	export let showIcon = true;
</script>

<div class="alert variant-{variant} size-{size} feedback-{feedback} ">
	{#if showIcon && feedback !== 'normal'}
		<div class="icon">
			{#if feedback === 'danger'}
				<Icon
					icon="material-symbols:dangerous-rounded"
					width="100%"
					height="100%"
					color="inherit"
				/>
			{/if}

			{#if feedback === 'warning'}
				<Icon icon="material-symbols:warning-rounded" width="100%" height="100%" color="inherit" />
			{/if}

			{#if feedback === 'success'}
				<Icon icon="material-symbols:check-circle" width="100%" height="100%" color="inherit" />
			{/if}

			{#if feedback === 'info'}
				<Icon icon="material-symbols:info-rounded" width="100%" height="100%" color="inherit" />
			{/if}
		</div>
	{/if}

	<div class="contents">
		<slot name="title" />
		<slot />
	</div>
</div>

<style lang="scss">
	.transition {
		transition-timing-function: ease-in-out;
		transition-duration: 0.1s;
		transition-property: width, height, border, color, background, padding, font-size;
	}
	.alert {
		// font-size
		--alert-font-size-sm: var(--font-size-sm);
		--alert-font-size-md: var(--font-size-md);
		--alert-font-size-lg: var(--font-size-lg);

		// padding
		--alert-padding-sm: var(--space-sm);
		--alert-padding-md: var(--space-md);
		--alert-padding-lg: var(--space-lg);

		// icon size
		--alert-icon-size-sm: var(--space-lg);
		--alert-icon-size-md: var(--space-xl);
		--alert-icon-size-lg: var(--space-xxl);

		// gap
		--alert-gap-sm: var(--space-xs);
		--alert-gap-md: var(--space-sm);
		--alert-gap-lg: var(--space-md);

		// variants
		&.variant-primary {
			--alert-background-color: var(--color-neutral-4);
		}

		&.variant-secondary {
			--alert-background-color: var(--color-neutral-1) !important;
			--alert-color: var(--alert-icon-color);
		}

		$feedbacks: 'danger', 'warning', 'success', 'info', 'normal';

		@each $feedback in $feedbacks {
			&.feedback-#{$feedback} {
				@if $feedback == 'normal' {
					$feedback: 'neutral';
					--alert-background-color: var(--color-#{$feedback}-2);
				} @else {
					--alert-background-color: var(--color-#{$feedback}-1);
				}

				--alert-color: var(--color-neutral-9);
				--alert-border-style: var(--color-#{$feedback}-4);
				--alert-icon-color: var(--color-#{$feedback}-7);
			}
		}

		// size
		&.size-sm {
			--alert-font-size: var(--alert-font-size-sm);
			--alert-padding: var(--alert-padding-sm);
			--alert-icon-size: var(--alert-icon-size-sm);
			--alert-gap: var(--alert-gap-sm);
		}

		&.size-md {
			--alert-font-size: var(--alert-font-size-md);
			--alert-padding: var(--alert-padding-md);
			--alert-icon-size: var(--alert-icon-size-md);
			--alert-gap: var(--alert-gap-md);
		}

		&.size-lg {
			--alert-font-size: var(--alert-font-size-lg);
			--alert-padding: var(--alert-padding-lg);
			--alert-icon-size: var(--alert-icon-size-lg);
			--alert-gap: var(--alert-gap-lg);
		}
	}

	.alert {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--alert-gap);
		border-radius: 4px;
		color: var(--alert-color);
		font-size: var(--alert-font-size);
		background-color: var(--alert-background-color);
		border-color: var(--alert-border-style);
		border-width: 1px;
		border-style: solid;
		padding: var(--alert-padding);
		width: 100%;

		@extend .transition;

		.contents {
			margin-top: 0.3rem;
		}

		.icon {
			width: var(--alert-icon-size);
			height: var(--alert-icon-size);
			color: var(--alert-icon-color);
		}
	}
</style>
