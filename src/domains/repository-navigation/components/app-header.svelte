<script lang="ts">
	import Icon from '@iconify/svelte';
	import { css } from '@pindoba/panda/css';
</script>

<div
	class={css({
		display: 'flex',
		gap: 'md',
		padding: 'md',
		alignItems: 'center',
		_dark: {
			borderBottom: '0px dashed token(colors.primary.300)'
		},
		_light: {
			borderBottom: '0px dashed token(colors.primary.700)'
		},
		height: 'calc((token(spacing.xl)) * 2.5)'
	})}
>
	<Icon
		icon="game-icons:tree-branch"
		width="24px"
		height="24px"
		class={css({
			_dark: {
				color: 'primary.800'
			},
			_light: {
				color: 'primary.800'
			}
		})}
	/>
	<h1
		class={css({
			_dark: {
				color: 'primary.950'
			},
			_light: {
				color: 'primary.800'
			},
			textStyle: '4xl',
			margin: '0'
		})}
	>
		Cut Branches
	</h1>
</div>
