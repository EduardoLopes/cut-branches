/**
 * @module Notification
 * @description Shape of a notification as `notifications.push(...)` accepts it.
 * Rendering is delegated to `@pindoba/svelte-toast`; see notifications.svelte.ts.
 */

export type NotificationFeedback = 'success' | 'danger' | 'warning' | 'default';

export interface NotificationData {
	id?: string;
	message?: string;
	title?: string;
	feedback?: NotificationFeedback;
	date?: number | null;
}
