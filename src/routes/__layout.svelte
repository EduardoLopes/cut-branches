<script>
	import { SvelteToast } from '@zerodevx/svelte-toast';
	import '../app.css';
</script>

<main>
	<SvelteToast options={{ intro: { y: 100 } }} />
	<slot />
</main>

<footer />

<style>
	main {
		min-height: 100vh;
	}

	:root {
		--toastContainerTop: auto;
		--toastContainerRight: 2rem;
		--toastContainerBottom: 0;
		--toastContainerLeft: 2rem;
		--toastWidth: 100%;
		--toastMinHeight: 1.5rem;
		--toastBackground: #799b1c;
		--toastProgressBackground: #c5ce3c;
		--toastMsgPadding: 1rem;
		font-size: 0.875rem;
	}
</style>
