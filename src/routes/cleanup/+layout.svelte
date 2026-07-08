<script lang="ts">
	import { type Snippet } from 'svelte';
	import AppShell from '$components/app-shell.svelte';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

<AppShell>
	{@render children?.()}
</AppShell>
