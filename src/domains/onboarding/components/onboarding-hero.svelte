<script lang="ts">
	import Icon from '@iconify/svelte';
	import { css } from '@pindoba/styled-system/css';
</script>

<div
	class={css({
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: 'xl',
		textAlign: 'center',
		position: 'relative'
	})}
>
	<!-- Icon container with animations -->
	<div
		class={css({
			position: 'relative',
			transform: 'translateY(-40px)',
			animation: 'float 6s ease-in-out infinite',
			height: '130px',
			_motionReduce: {
				animation: 'none'
			}
		})}
	>
		<div
			class={css({
				position: 'relative',
				zIndex: 1,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				width: '180px',
				height: '180px',

				transform: 'translateY(-40px)',
				borderRadius: 'full',
				background:
					'linear-gradient(135deg, token(colors.primary.100) 0%, token(colors.primary.300) 50%, token(colors.success.200) 100%)',
				border: '1px solid',
				borderColor: 'primary.alpha.200',
				overflow: 'hidden',
				transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
				color: 'primary.800',
				_hover: {
					transform: 'scale(1.08) rotate(5deg) translateY(-70px)',
					border: '1px solid',
					borderColor: 'primary.alpha.600',
					color: 'primary.800.contrast'
				},
				'&::before': {
					content: '""',
					position: 'absolute',
					inset: 0,
					background:
						'linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
					transform: 'translateX(-100%)',
					transition: 'transform 0.6s'
				},
				'&:hover::before': {
					transform: 'translateX(100%)'
				}
			})}
		>
			<Icon icon="game-icons:tree-branch" width="96px" height="96px" />
		</div>
	</div>

	<!-- Title and tagline with animations -->
	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			gap: 'md'
		})}
	>
		<h1
			class={css({
				fontSize: '5xl',
				fontWeight: 'extrabold',
				margin: '0',
				color: 'primary.800.contrast',
				background:
					'linear-gradient(135deg, token(colors.primary.900) 0%, token(colors.primary.800.contrast) 50%, token(colors.success.600) 100%)',
				WebkitTextFillColor: 'transparent',
				backgroundClip: 'text',
				letterSpacing: 'tight',
				lineHeight: '1.1',
				backgroundSize: '200% 200%',
				animation: 'fadeIn 0.8s ease-out 0.2s both, gradientShift 3s ease infinite',
				_motionReduce: {
					animation: 'none',
					backgroundSize: '100% 100%'
				}
			})}
		>
			Cut Branches
		</h1>

		<p
			class={css({
				fontSize: 'xl',
				color: 'primary.800',
				margin: '0',
				maxWidth: '600px',
				lineHeight: '1.8',
				fontWeight: 'medium',
				opacity: 0.9,
				animation: 'fadeIn 0.8s ease-out 0.4s both',
				_motionReduce: {
					animation: 'none'
				}
			})}
		>
			Manage and clean up your Git branches effortlessly
		</p>
	</div>
</div>
