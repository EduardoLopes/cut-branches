/**
 * @module useNotificationPagination
 * @description Composable for managing notification pagination and infinite scrolling
 */

import { onMount, onDestroy } from 'svelte';
import type { Notification } from '../models/notification';

export interface PaginationOptions {
	getNotifications: () => Notification[];
	pageSize?: number;
	enabled?: boolean;
}

export interface PaginationState {
	page: number;
	isLoading: boolean;
	hasError: boolean;
	errorMessage: string;
}

/**
 * Composable for managing notification pagination with infinite scroll
 * @param props - Configuration object containing notifications getter and pagination options
 * @returns Pagination state and utility functions
 */
export function useNotificationPagination(props: PaginationOptions) {
	const { getNotifications, pageSize = 10, enabled = true } = props;

	let page = $state(1);
	let isLoading = $state(false);
	let hasError = $state(false);
	let errorMessage = $state('');
	let observer: IntersectionObserver | null = $state(null);
	let sentinel: HTMLElement | null = $state(null);

	/**
	 * Gets paginated notifications (newest first)
	 */
	const paginatedNotifications = $derived(
		enabled ? [...getNotifications()].reverse().slice(0, page * pageSize) : getNotifications()
	);

	/**
	 * Checks if there are more notifications to load
	 */
	const hasMore = $derived(page * pageSize < getNotifications().length);

	/**
	 * Loads the next page of notifications
	 */
	function loadMore() {
		if (!hasMore || isLoading) return;

		try {
			isLoading = true;
			page++;
		} catch (error) {
			console.error('Error loading more notifications:', error);
			hasError = true;
			errorMessage = 'Failed to load more notifications';
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Resets pagination to the first page
	 */
	function reset() {
		page = 1;
		hasError = false;
		errorMessage = '';
	}

	/**
	 * Retries loading after an error
	 */
	function retry() {
		hasError = false;
		errorMessage = '';
		loadMore();
	}

	/**
	 * Sets up the Intersection Observer for infinite scrolling
	 */
	function setupObserver() {
		if (observer || !enabled) return;

		try {
			observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting && !isLoading) {
							loadMore();
						}
					});
				},
				{
					rootMargin: '100px',
					threshold: 0.1
				}
			);

			if (sentinel) {
				observer.observe(sentinel);
			}
		} catch (error) {
			console.error('Error setting up intersection observer:', error);
			// Fallback to manual loading if observer fails
			observer = null;
		}
	}

	/**
	 * Cleans up the Intersection Observer
	 */
	function cleanup() {
		if (observer && sentinel) {
			observer.unobserve(sentinel);
			observer.disconnect();
			observer = null;
		}
	}

	/**
	 * Svelte action to bind a sentinel element for infinite scroll
	 */
	function bindSentinel(element: HTMLElement) {
		// Cleanup old observer if exists
		if (observer && sentinel) {
			observer.unobserve(sentinel);
		}

		sentinel = element;

		// Setup new observer if element exists
		if (sentinel && observer) {
			observer.observe(sentinel);
		} else if (sentinel && !observer) {
			setupObserver();
		}

		return {
			destroy() {
				if (observer && sentinel) {
					observer.unobserve(sentinel);
				}
			}
		};
	}

	// Setup on mount
	onMount(() => {
		setupObserver();
	});

	// Cleanup on destroy
	onDestroy(() => {
		cleanup();
	});

	return {
		// State (use getters for reactivity)
		get page() {
			return page;
		},
		get isLoading() {
			return isLoading;
		},
		get hasError() {
			return hasError;
		},
		get errorMessage() {
			return errorMessage;
		},
		get paginatedNotifications() {
			return paginatedNotifications;
		},
		get hasMore() {
			return hasMore;
		},

		// Actions
		loadMore,
		reset,
		retry,
		bindSentinel
	};
}
