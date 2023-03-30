<script lang="ts">
	import type * as CSS from 'csstype';
	import type { HTMLAttributes } from 'svelte/elements';

	interface $$Props extends HTMLAttributes<HTMLDivElement> {
		size?: CSS.Properties['width'];
		color?: CSS.Properties['color'];
	}

	export let size: CSS.Properties['width'] = '1.16rem';
	export let color: CSS.Properties['color'] = '#000';
</script>

<div class="container icon {$$restProps.class}" style="--size:{size};--color:{color};">
	<slot />
</div>

<style lang="scss">
	.container {
		width: var(--size);
		height: var(--size);
		color: var(--color);
	}
</style>
