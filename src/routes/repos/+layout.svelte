<script lang="ts">
	import { type Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AddButton from '$domains/repository-management/components/add-button.svelte';
	import MenuView from '$domains/repository-navigation/views/menu-view.svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

<div
	class={css({
		width: '100%',
		flex: 1,
		display: 'flex',
		flexDirection: 'column'
	})}
>
	<div
		class={css({
			display: 'grid',
			gridTemplateColumns: 'max-content auto'
		})}
	>
		<MenuView>
			{#snippet repositoryListAction()}
				<AddButton
					size="md"
					shape="square"
					emphasis="secondary"
					icon="material-symbols:add-rounded"
					visuallyHiddenLabel
					onSuccess={(data) => goto(resolve(`/repos/${data.id}`))}
				/>
			{/snippet}
		</MenuView>
		{@render children?.()}
	</div>
</div>
