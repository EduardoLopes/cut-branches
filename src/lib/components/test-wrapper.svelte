<script lang="ts" generics="T extends Component">
	import type { ComponentProps } from 'svelte';
	// eslint-disable-next-line
	import { type Component } from 'svelte';
	import Providers from './providers.svelte';

	//TODO: the generics here are not working as expected
	interface Props {
		// eslint-disable-next-line
		Component: T;
		// eslint-disable-next-line
		props?: ComponentProps<T>;
	}

	const { Component: WrappedComponent, props }: Props = $props();
</script>

<Providers>
	{#if WrappedComponent}
		<WrappedComponent {...props} />
	{/if}
</Providers>
