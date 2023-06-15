<script lang="ts">
	import Icon from '@iconify/svelte';
	import AddButton from '$lib/AddButton.svelte';
</script>

<div class="content">
	<div class="logo-container">
		<Icon icon="game-icons:tree-branch" width="48px" height="48px" color="var(--color-primary-7)" />

		<h1 class="logo">Cut Branches</h1>
	</div>
	<AddButton />
</div>

<style lang="scss">
	.content {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		height: 100vh;

		.logo-container {
			display: flex;
			gap: 0.8rem;
			align-items: center;
			padding: 4.8rem;

			.logo {
				color: var(--color-primary-7);
				font-size: 2.4rem;
				margin: 0;
				font-weight: bold;
			}
		}
	}
</style>
