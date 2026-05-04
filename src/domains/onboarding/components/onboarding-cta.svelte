<script lang="ts">
	import Icon from '@iconify/svelte';
	import { type Snippet } from 'svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		actionButton: Snippet<[]>;
	}

	const { actionButton }: Props = $props();
</script>

<div
	class={css({
		display: 'flex',
		flexDirection: 'column',
		gap: '3xl',
		alignItems: 'center',
		width: 'full'
	})}
>
	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			gap: 'sm',
			alignItems: 'center',
			width: 'full'
		})}
	>
		<p
			class={css({
				fontSize: 'lg',
				color: 'neutral.950.contrast',
				margin: '0',
				textAlign: 'center',
				fontWeight: 'medium',
				lineHeight: '1.6',
				animation: 'fadeInUp 0.6s ease-out 0.6s both',
				_motionReduce: {
					animation: 'none'
				}
			})}
		>
			Get started by adding your first Git repository
		</p>
	</div>

	<div
		class={css({
			animation: 'fadeInUp 0.6s ease-out 0.8s both',
			_motionReduce: {
				animation: 'none'
			}
		})}
	>
		{@render actionButton()}
	</div>

	<!-- Feature highlights -->
	<div
		class={css({
			display: 'grid',
			gridTemplateColumns: 'repeat(3, 1fr)',
			gap: 'lg',
			width: 'full',
			opacity: 0.9,
			animation: 'fadeInUp 0.6s ease-out 1s both',
			color: 'neutral.950',
			_motionReduce: {
				animation: 'none'
			}
		})}
	>
		<div
			class={css({
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 'xs',
				textAlign: 'center',
				padding: 'md'
			})}
		>
			<div
				class={css({
					width: '48px',
					height: '48px',
					borderRadius: 'full',
					background: 'primary.50',
					color: 'primary.900',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center'
				})}
			>
				<Icon icon="mdi:check-circle" width="24px" height="24px" />
			</div>
			<p
				class={css({
					fontSize: 'sm',
					margin: '0',
					fontWeight: 'medium'
				})}
			>
				Clean with confidence
			</p>
		</div>

		<div
			class={css({
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 'xs',
				textAlign: 'center',
				padding: 'md'
			})}
		>
			<div
				class={css({
					width: '48px',
					height: '48px',
					borderRadius: 'full',
					background: 'primary.50',
					color: 'primary.900',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center'
				})}
			>
				<Icon icon="mdi:history" width="24px" height="24px" />
			</div>
			<p
				class={css({
					fontSize: 'sm',
					margin: '0',
					fontWeight: 'medium'
				})}
			>
				Track & restore
			</p>
		</div>

		<div
			class={css({
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 'xs',
				textAlign: 'center',
				padding: 'md'
			})}
		>
			<div
				class={css({
					width: '48px',
					height: '48px',
					borderRadius: 'full',
					background: 'primary.50',
					color: 'primary.900',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center'
				})}
			>
				<Icon icon="mdi:lightning-bolt" width="24px" height="24px" />
			</div>
			<p
				class={css({
					fontSize: 'sm',
					margin: '0',
					fontWeight: 'medium'
				})}
			>
				Bulk operations
			</p>
		</div>
	</div>
</div>
