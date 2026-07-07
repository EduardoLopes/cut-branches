<script lang="ts">
	import { type Snippet } from 'svelte';
	import AppShell from '$components/app-shell.svelte';
	import SettingsShell from '$domains/app-settings/views/settings-shell.svelte';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

<AppShell>
	<SettingsShell>
		{@render children?.()}
	</SettingsShell>
</AppShell>
