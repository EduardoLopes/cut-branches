<script lang="ts">
	import '../styles/app.css';
	import ThemeModeSelectScript from '@pindoba/svelte-theme-mode-select/script';
	import { type Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Providers from '$components/providers.svelte';
	import { RepositoryStore } from '$domains/repository-management/store/repository.svelte';
	import Footer from '$ui/core/footer.svelte';
	import { css } from '@pindoba/panda/css';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	// Add onMount to ensure repositories are loaded when the app starts
	onMount(() => {
		// This ensures repositories data is loaded from localStorage
		RepositoryStore.loadRepositories();
	});

	const idExists = $derived(
		page.params.id ? RepositoryStore.repositories?.has(page.params.id) : false
	);

	const first = $derived(RepositoryStore.repositories?.list[0]);

	$effect(() => {
		if (RepositoryStore.repositories?.list.length === 0) {
			goto(resolve('/add-first'));
		} else {
			if (first && !idExists) {
				goto(resolve(`/repos/${first}`));
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
