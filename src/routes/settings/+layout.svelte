<script lang="ts">
	import { type Snippet } from 'svelte';
	import SettingsShell from '$domains/app-settings/views/settings-shell.svelte';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

<SettingsShell>
	{@render children?.()}
</SettingsShell>
