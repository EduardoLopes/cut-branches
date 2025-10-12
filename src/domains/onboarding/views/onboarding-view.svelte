<script lang="ts">
	import OnboardingCta from '$domains/onboarding/components/onboarding-cta.svelte';
	import OnboardingHero from '$domains/onboarding/components/onboarding-hero.svelte';
	import { css } from '@pindoba/panda/css';
</script>

<div
	class={css({
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		position: 'relative',
		overflow: 'hidden',
		h: 'full',
		background: 'neutral.alpha.50',
		'&::before': {
			content: '""',
			position: 'absolute',
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			background:
				'radial-gradient(circle at 80% 20%, token(colors.primary.alpha.200) 0%, transparent 50%), radial-gradient(circle at 20% 80%, token(colors.primary.alpha.200) 0%, transparent 50%)',
			pointerEvents: 'none'
		}
	})}
>
	<!-- Main card with glassmorphism -->
	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			gap: '3xl',
			padding: '3xl',
			backdropFilter: 'blur(20px) saturate(180%)',
			borderRadius: '2xl',
			border: '1px solid',
			borderColor: 'primary.alpha.50',
			maxWidth: '700px',
			width: 'full',
			position: 'relative',
			background: `
				linear-gradient( token(colors.primary.50), token(colors.primary.100) ) padding-box,
				linear-gradient( var(--angle), token(colors.neutral.alpha.50) 30%, token(colors.primary.700) ) border-box`,
			animation: '8s rotateAngle linear infinite, slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) both',
			_motionReduce: {
				animation: 'none'
			}
		})}
	>
		<OnboardingHero />
		<OnboardingCta />
	</div>
</div>
