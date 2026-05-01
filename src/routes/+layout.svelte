<script lang="ts">
	import '../styles/app.css';
	import ThemeModeSelectScript from '@pindoba/svelte-theme-mode-select/script';
	import Toaster from '@pindoba/svelte-toast';
	import { type Snippet } from 'svelte';
	import Providers from '$components/providers.svelte';
	import RedirectToGetStarted from '$domains/onboarding/components/redirect-to-get-started.svelte';
	import Footer from '$ui/core/footer.svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

<ThemeModeSelectScript />

<Providers>
	<div
		class={css({
			height: '100vh',
			display: 'flex',
			position: 'relative',
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

		<RedirectToGetStarted />

		<Footer />
	</div>
	<Toaster position="top-right" enableHistory />
</Providers>
