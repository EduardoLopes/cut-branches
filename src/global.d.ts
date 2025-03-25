/// <reference types="@sveltejs/kit" />

declare module 'carbon-icons-svelte/*';

declare global {
	declare const __APP_VERSION__: string;
	interface ServiceError {
		message: string;
		kind: string;
		description?: string;
	}
}

export {};
