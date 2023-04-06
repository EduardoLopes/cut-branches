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
	export let showIcon: boolean = true;
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

		//feedback
		&.feedback-normal {
			--alert-background-color: var(--color-neutral-4);
			--alert-border-style: var(--color-neutral-6);
			--alert-color: var(--color-neutral-12);
			--alert-border-style: var(--color-neutral-6);
		}

		&.feedback-danger {
			--alert-background-color: var(--color-danger-4);
			--alert-border-style: var(--color-danger-6);
			--alert-icon-color: var(--color-danger-10);
		}

		&.feedback-warning {
			--alert-background-color: var(--color-warning-3);
			--alert-border-style: var(--color-warning-6);
			--alert-icon-color: var(--color-warning-10);
		}

		&.feedback-success {
			--alert-background-color: var(--color-success-4);
			--alert-border-style: var(--color-success-6);
			--alert-icon-color: var(--color-success-10);
		}

		&.feedback-info {
			--alert-background-color: var(--color-info-4);
			--alert-border-style: var(--color-info-6);
			--alert-icon-color: var(--color-info-10);
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
