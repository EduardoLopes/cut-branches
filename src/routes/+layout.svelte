<script lang="ts">
	import '../styles/app.css';
	import ThemeModeSelectScript from '@pindoba/svelte-theme-mode-select/script';
	import Toaster from '@pindoba/svelte-toast';
	import { type Snippet } from 'svelte';
	import Providers from '$components/providers.svelte';
	import RedirectToApp from '$domains/onboarding/components/redirect-to-app.svelte';
	import WelcomeModal from '$domains/onboarding/components/welcome-modal.svelte';
	import AddRepositoryMenu from '$domains/repository-management/components/add-repository-menu.svelte';
	import SidebarCollapseToggle from '$domains/repository-navigation/components/sidebar-collapse-toggle.svelte';
	import Footer from '$ui/core/footer.svelte';
	import WindowTitlebar from '$ui/core/window-titlebar.svelte';
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
		<!-- macOS only, and above the sidebar rather than inside it: collapsed,
		     the rail is narrower than the traffic lights themselves, so a toggle
		     beside them can't belong to the sidebar's own column. -->
		<WindowTitlebar>
			<SidebarCollapseToggle size="xs" />
		</WindowTitlebar>

		{@render children?.()}

		<RedirectToApp />

		<WelcomeModal>
			{#snippet actionButton()}
				<AddRepositoryMenu size="md" emphasis="primary" />
			{/snippet}
		</WelcomeModal>

		<Footer />
	</div>
	<Toaster position="top-right" enableHistory />
</Providers>
