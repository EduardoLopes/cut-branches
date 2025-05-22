/// <reference types="@sveltejs/kit" />

declare module 'carbon-icons-svelte/*';

import '@tanstack/svelte-query';

declare global {
	declare const __APP_VERSION__: string;
}
interface QueryMeta extends Record<string, unknown> {
	showSuccessNotification?: boolean;
	showErrorNotification?: boolean;
	notification?: {
		title?: string;
		message?: string;
	};
}

type MutationMeta = QueryMeta;

declare module '@tanstack/svelte-query' {
	interface Register {
		queryMeta: QueryMeta;
		mutationMeta: MutationMeta;
	}
}
