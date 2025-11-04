<script lang="ts" generics="T extends SvelteComponent">
	import '../styles/app.css';
	import type { QueryClientConfig } from '@tanstack/svelte-query';
	import { mergeRight } from 'ramda';
	import type { Component as SvelteComponent, ComponentProps } from 'svelte';
	import Providers from '$components/providers.svelte';

	interface Props {
		component: T;
		componentProps?: ComponentProps<T>;
		queryClientOptions?: QueryClientConfig;
	}

	const { component: Component, componentProps, queryClientOptions }: Props = $props();

	const mergedQueryClientOptions = $derived(
		mergeRight(queryClientOptions ?? {}, {
			defaultOptions: {
				queries: {
					retry: false,
					staleTime: 0,
					gcTime: 0
				}
			}
		})
	);
</script>

<Providers queryClientOptions={mergedQueryClientOptions}>
	{#if Component}
		<Component {...componentProps} />
	{/if}
</Providers>
