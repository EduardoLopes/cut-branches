<script lang="ts">
	import type * as CSS from 'csstype';

	export let direction: CSS.Properties['flexDirection'] = 'column';
	export let align: CSS.Properties['alignItems'] = 'flex-start';
	export let justify: CSS.Properties['justifyContent'] = 'flex-start';
	export let gap: CSS.Properties['gap'] = '1rem';
	export let wrap: CSS.Properties['flexWrap'] = 'nowrap';
</script>

<div
	class="container"
	style="--direction:{direction};--align:{align};--justify:{justify};--gap:{gap};--wrap:{wrap};"
>
	<slot />
</div>

<style lang="scss">
	.container {
		display: flex;
		flex-direction: var(--direction);
		align-items: var(--align);
		justify-content: var(--justify);
		gap: var(--gap);
		flex-wrap: var(--wrap);
	}
</style>
