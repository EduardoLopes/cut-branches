<script lang="ts">
	// Nothing renders here for long: `RedirectToApp` in the root layout sends the
	// user to `/repos` (or their first repository). The shell is already mounted
	// around us, so fill the main column while that resolves.
	import Loading from '@pindoba/svelte-loading';
	import PageShell from '$ui/patterns/page-shell.svelte';
	import { css } from '@pindoba/styled-system/css';
</script>

<PageShell>
	<div class={css({ display: 'grid', placeItems: 'center', flex: '1', minHeight: '0' })}>
		<Loading loading />
	</div>
</PageShell>
