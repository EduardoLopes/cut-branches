<script lang="ts">
	import GiTreeBranch from 'svelte-icons/gi/GiTreeBranch.svelte';
	import Icon from '$lib/primitives/Icon/index.svelte';
	import AddButton from '$lib/AddButton.svelte';
</script>

<div class="content">
	<div class="logo-container">
		<Icon size="4.8rem" color="var(--color-primary-3)">
			<GiTreeBranch />
		</Icon>

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
				color: var(--color-primary-3);
				font-size: 2.4rem;
				margin: 0;
				font-weight: bold;
			}
		}
	}
</style>
