<script lang="ts">
	import { type Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AddButton from '$domains/repository-management/components/add-repository-button.svelte';
	import SidebarView from '$domains/repository-navigation/views/sidebar-view.svelte';
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
			gridTemplateColumns: 'max-content auto',
			flex: 1,
			minHeight: 0
		})}
	>
		<SidebarView>
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
		</SidebarView>
		{@render children?.()}
	</div>
</div>
