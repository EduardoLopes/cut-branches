import { toast } from '@pindoba/svelte-toast';
import type { NotificationData, NotificationFeedback } from './notification';

const FEEDBACK_TO_TYPE: Record<NotificationFeedback, 'success' | 'danger' | 'warning' | 'neutral'> =
	{
		success: 'success',
		danger: 'danger',
		warning: 'warning',
		default: 'neutral'
	};

/**
 * Thin wrapper around `@pindoba/svelte-toast` that preserves the legacy
 * `notifications.push(...)` call signature used throughout the app.
 */
export const notifications = {
	push(data: NotificationData) {
		toast({
			id: data.id,
			type: FEEDBACK_TO_TYPE[data.feedback ?? 'default'],
			title: data.title,
			content: data.message
		});
	}
};

export { type NotificationData } from './notification';
