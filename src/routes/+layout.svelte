<script lang="ts">
	import '../styles/app.css';
	import { css } from '@pindoba/styled-system/css';
	import ThemeModeSelectScript from '@pindoba/svelte-theme-mode-select/script';
	import { type Snippet } from 'svelte';
	import Providers from '$components/providers.svelte';
	import RedirectToGetStarted from '$domains/onboarding/components/redirect-to-get-started.svelte';
	import Footer from '$ui/core/footer.svelte';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

<ThemeModeSelectScript />

<Providers>
	<RedirectToGetStarted />
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
