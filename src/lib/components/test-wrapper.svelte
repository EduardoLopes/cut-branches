<script module lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any */
	export function testWrapperWithProps<TComponent extends Component<any, any, any>>(
		component: TComponent,
		props?: ComponentProps<TComponent>
	) {
		return {
			component,
			props
		};
	}
</script>

<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any */
	import type { Component, ComponentProps } from 'svelte';
	import Providers from './providers.svelte';

	//TODO: the generics here are not working as expected
	interface Props {
		component: Component<any, any, any>;

		props?: ComponentProps<any>;
	}

	const { component: WrappedComponent, props }: Props = $props();
</script>

<Providers>
	{#if WrappedComponent}
		<WrappedComponent {...props} />
	{/if}
</Providers>
