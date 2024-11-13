/// <reference types="@sveltejs/kit" />
/// <reference types="histoire" />

declare module 'carbon-icons-svelte/*';

declare const __APP_VERSION__: string;

export interface ServiceError {
	message: string;
	kind: string;
	description?: string;
}
