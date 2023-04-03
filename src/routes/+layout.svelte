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
		width: 100%;
		min-height: 100vh;
	}

	:root {
		--toastContainerTop: auto;
		--toastContainerRight: 2rem;
		--toastContainerBottom: 0;
		--toastContainerLeft: 2rem;
		--toastWidth: 100%;
		--toastMinHeight: 1.5rem;
		--toastMsgPadding: 1rem;
	}
</style>
