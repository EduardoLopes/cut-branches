<script lang="ts">
	import '../app.css';
	import ThemeModeSelectScript from '@pindoba/svelte-theme-mode-select/script';
	import {
		MutationCache,
		QueryCache,
		QueryClient,
		QueryClientProvider
	} from '@tanstack/svelte-query';
	import { type Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Footer from '$lib/components/footer.svelte';
	import type { ServiceError } from '$lib/services/models';
	import { notifications } from '$lib/stores/notifications.svelte';
	import { repositories } from '$lib/stores/repositories.svelte';
	import { css } from '@pindoba/panda/css';
	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const mutationCache = new MutationCache({
		onSuccess: (_data, _variabled, _context, mutation) => {
			if (mutation.meta?.showSuccessNotification) {
				const notificationInfo = mutation.meta?.notification as {
					message: string;
					description: string;
				};

				if (notificationInfo.message) {
					notifications.push({
						feedback: 'success',
						title: notificationInfo.message,
						message: notificationInfo.description
					});
				}
			}
		},
		onError: (error, _variabled, _context, mutation) => {
			const e = error as unknown as ServiceError;

			if (mutation.meta?.showErrorNotification) {
				notifications.push({ feedback: 'danger', title: e.message, message: e.description });
			}
		}
	});

	const queryCache = new QueryCache({
		onSuccess: (_, query) => {
			if (query.meta?.showSuccessNotification) {
				const notificationInfo = query.meta?.notification as {
					message: string;
					description: string;
				};

				if (notificationInfo.message) {
					notifications.push({
						feedback: 'success',
						title: notificationInfo.message,
						message: notificationInfo.description
					});
				}
			}
		},
		onError: (error, query) => {
			const e = error as unknown as ServiceError;

			if (query.meta?.showErrorNotification) {
				notifications.push({ feedback: 'danger', title: e.message, message: e.description });
			}
		}
	});

	const queryClient = new QueryClient({
		mutationCache,
		queryCache,
		defaultOptions: {
			queries: {
				enabled: browser,
				retry: 0,
				refetchOnWindowFocus: false
			}
		}
	});

	$effect(() => {
		if (repositories.list.length === 0) {
			goto('/add-first');
			return;
		}

		// if is in any route that requires a repo id and the repo does not exist in the app anymore
		const idExists = Boolean(repositories.findById($page.params.id));

		if (repositories.first?.id && !idExists) {
			goto(`/repos/${repositories.first.id}`);
			return;
		}
	});
</script>

<ThemeModeSelectScript />

<QueryClientProvider client={queryClient}>
	<div
		class={css({
			height: '100vh',
			display: 'flex',
			flexDirection: 'column',
			overflow: 'hidden'
		})}
	>
		{@render children()}

		<Footer />
	</div>
</QueryClientProvider>
