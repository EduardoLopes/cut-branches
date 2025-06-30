<script lang="ts">
	import Icon from '@iconify/svelte';
	import AddButton from '$domains/repository-management/components/add-button.svelte';
	import { css } from '@pindoba/panda/css';
	import { token } from '@pindoba/panda/tokens';
</script>

<div
	class={css({
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'column',
		height: '100vh',
		background: 'primary.50'
	})}
>
	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			gap: 'md',
			alignItems: 'center',
			padding: 'md'
		})}
	>
		<Icon
			icon="game-icons:tree-branch"
			width="48px"
			height="48px"
			color={token('colors.primary.800')}
		/>

		<h1
			class={css({
				color: token('colors.primary.950'),
				fontSize: 'xl',
				margin: '0',
				fontWeight: 'bold'
			})}
		>
			Cut Branches
		</h1>
	</div>
	<AddButton size="lg" emphasis="secondary" icon="material-symbols:add-circle-outline-rounded" />
</div>
