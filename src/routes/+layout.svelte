<script lang="ts">
	import '../app.css';

	import { type Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Footer from '$lib/components/footer.svelte';
	import Providers from '$lib/components/providers.svelte';
	import { repositories } from '$lib/stores/repositories.svelte';
	import { css } from '@pindoba/panda/css';
	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	$effect(() => {
		if (repositories.list.length === 0) {
			goto('/add-first');
		} else {
			// if is in any route that requires a repo id and the repo does not exist in the app anymore
			const idExists = Boolean(repositories.findById($page.params.id));

			if (repositories.first?.id && !idExists) {
				goto(`/repos/${repositories.first.id}`);
			}
		}
	});
</script>

<Providers>
	<div
		class={css({
			height: '100vh',
			display: 'flex',
			flexDirection: 'column',
			overflow: 'hidden'
		})}
	>
		{@render children?.()}

		<Footer />
	</div>
</Providers>
