<script lang="ts">
	import CircleDash32 from 'carbon-icons-svelte/lib/CircleDash.svelte';

	export let show: boolean = false;
	export let overlay: boolean = false;
</script>

<div class="loading" class:show class:overlay>
	<CircleDash32 class="spin" />
</div>

<style src="./styles.scss" lang="scss"></style>
