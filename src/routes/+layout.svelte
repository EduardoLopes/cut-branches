<script lang="ts">
	import '../app.css';
	import ThemeModeSelectScript from '@pindoba/svelte-theme-mode-select/script';
	import { type Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Footer from '$lib/components/footer.svelte';
	import Providers from '$lib/components/providers.svelte';
	import { RepositoryStore } from '$lib/stores/repository.svelte';
	import { css } from '@pindoba/panda/css';
	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const idExists = $derived(RepositoryStore.repositories?.has($page.params.id));

	const first = $derived(RepositoryStore.repositories?.list[0]);

	$effect(() => {
		if (RepositoryStore.repositories?.state.size === 0) {
			goto('/add-first');
		} else {
			if (first && !idExists) {
				goto(`/repos/${first}`);
			}
		}
	});
</script>

<ThemeModeSelectScript />

<Providers>
	<div
		class={css({
			height: '100vh',
			display: 'flex',
			flexDirection: 'column',
			overflow: 'hidden',
			_light: {
				background: 'neutral.200'
			},
			_dark: {
				background: 'neutral.50'
			}
		})}
	>
		{@render children?.()}

		<Footer />
	</div>
</Providers>
