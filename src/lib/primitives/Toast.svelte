<script context="module" lang="ts">
	const TOAST_DEFAULT_TIMEOUT_MS = 6000;

	export interface Toast {
		message: string;
		feedback: AlertFeedback;
		id: number;
		count: number;
		timeout: number;
		timeoutId?: number;
		description?: string;
	}

	interface ToastOptions {
		message: string;
		description?: string;
		feedback?: AlertFeedback;
		id?: number;
		timeout?: number;
	}

	export const toastsStore = writable<Toast[]>([]);

	function hide(toast: Toast) {
		//toast
		const t = toast;

		if (t.timeoutId) {
			window.clearTimeout(t.timeoutId);
			t.timeoutId = undefined;
		}

		toastsStore.update((toasts) => {
			return toasts;
		});

		if (t) {
			t.timeoutId = window.setTimeout(() => {
				toastsStore.update((toasts) => {
					const filtered = toasts.filter((item) => item.id !== toast.id);

					return filtered;
				});
			}, t.timeout);
		}
	}

	export function addToast(toastOptions: ToastOptions) {
		const newToast: Toast = {
			message: toastOptions.message,
			feedback: toastOptions.feedback || 'normal',
			description: toastOptions.description,
			id:
				toastOptions.id ||
				hash(`${toastOptions.message}_${toastOptions.feedback}_${toastOptions.description}}`),
			timeout: toastOptions.timeout || TOAST_DEFAULT_TIMEOUT_MS,
			timeoutId: 0,
			count: 0
		};

		const toast = get(toastsStore).find((item) => item.id === newToast.id) || newToast;

		toast.count += 1;

		hide(toast);

		toastsStore.update((toasts) => {
			const filtered = toasts.filter((item) => item.id !== toast.id);

			return [toast, ...filtered];
		});
	}

	export const toast = {
		add: addToast,
		success: (options: ToastOptions) => addToast({ feedback: 'success', ...options }),
		info: (options: ToastOptions) => addToast({ feedback: 'info', ...options }),
		warning: (options: ToastOptions) => addToast({ feedback: 'warning', ...options }),
		danger: (options: ToastOptions) => addToast({ feedback: 'danger', ...options })
	};
</script>

<script lang="ts">
	import Alert, { type AlertFeedback } from '$lib/primitives/Alert.svelte';
	import { flip } from 'svelte/animate';
	import { get, writable } from 'svelte/store';
	import { fade, fly } from 'svelte/transition';
	import { resizeContainer } from '$lib/actions/resizeContainer';
	import debounce from 'just-debounce-it';
	import hash from 'hash-it';

	const clearToastTimeout = debounce((toast: Toast) => {
		if (toast.timeoutId) {
			window.clearTimeout(toast.timeoutId);
			toast.timeoutId = undefined;
		}
	}, 250);

	// used for debug
	// for (let i = 0; i < 10; i++) {
	// 	console.log(`Hello World ${i}`);
	// 	toast.add({
	// 		message: `Hello World ${i}`,
	// 		description: 'This is a description',
	// 		feedback: (['success', 'info', 'warning', 'danger', 'normal'] as AlertFeedback[])[
	// 			Math.floor(Math.random() * 4)
	// 		]
	// 	});
	// }
</script>

<div class="container" use:resizeContainer>
	{#if $toastsStore.length}
		<div class="container-wrapper">
			{#each $toastsStore as toast (toast.id)}
				<!-- svelte-ignore a11y-mouse-events-have-key-events -->
				<div
					class="alert-container feedback-{toast.feedback}"
					style="--timeout-ms:{toast.timeout ?? TOAST_DEFAULT_TIMEOUT_MS}ms;"
					animate:flip={{ duration: 150 }}
					in:fly|local={{
						x: -30,
						duration: 150
					}}
					out:fly|local={{
						x: 30,
						duration: 150
					}}
					on:mouseover={() => {
						clearToastTimeout(toast);
					}}
					on:mouseout={() => {
						if (toast && !toast.timeoutId) {
							hide(toast);
						}
					}}
				>
					<Alert feedback={toast.feedback}>
						{@html toast.message}

						{#if toast.description}
							<div class="description">{@html toast.description}</div>
						{/if}
					</Alert>
					{#key toast.count}
						{#if toast.count > 1}
							<div
								class="count"
								in:fly={{ duration: 150, x: -20, opacity: 0 }}
								out:fly={{ duration: 150, x: 30, opacity: 0 }}
							>
								{toast.count}
							</div>
						{/if}
					{/key}

					{#key toast.timeoutId}
						<div class="timeout" out:fade={{ duration: 400 }} />
					{/key}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style lang="scss">
	.container {
		position: fixed;
		width: 400px;
		z-index: 1000;
		top: 0;
		right: 0;
		height: min-content;
		background: hsla(0%, 0%, 100%, 0.6);
		box-shadow: 0 0 0 1px hsla(0%, 0%, 0%, 0.1), 0 4px 11px hsla(0%, 0%, 0%, 0.1);
		-webkit-backdrop-filter: blur(2px);
		backdrop-filter: blur(2px);
		border-radius: 0 0 0 4px;

		.container-wrapper {
			padding: 1.6rem;
			display: flex;
			flex-direction: column;
			gap: 1.6rem;
			max-height: 100vh;
			overflow-y: auto;
		}
	}

	.alert-container {
		position: relative;
		margin: 0;
		border-radius: 4px;

		.description {
			margin-top: 0.8rem;
			font-size: 1.2rem;
			color: var(--color-neutral-10);
		}

		--color-main-1: var(--color-neutral-10);
		--color-main-2: var(--color-neutral-11);

		&.feedback-normal {
			--color-main-1: var(--color-neutral-10);
			--color-main-2: var(--color-neutral-11);
		}

		&.feedback-danger {
			--color-main-1: var(--color-danger-10);
			--color-main-2: var(--color-danger-11);
		}

		&.feedback-warning {
			--color-main-1: var(--color-warning-10);
			--color-main-2: var(--color-warning-11);
		}

		&.feedback-success {
			--color-main-1: var(--color-success-10);
			--color-main-2: var(--color-success-11);
		}

		&.feedback-info {
			--color-main-1: var(--color-info-10);
			--color-main-2: var(--color-info-11);
		}

		&:hover {
			:global(.alert) {
				border-color: var(--color-main-1);
			}

			.timeout {
				opacity: 0;
				filter: opacity(0.6);
			}
		}

		@keyframes timeout {
			0% {
				width: 100%;
			}

			100% {
				width: 0%;
			}
		}

		.timeout {
			position: absolute;
			transition: opacity 250ms ease-in-out 250ms, background 250ms ease-in-out;
			bottom: 0;
			height: 3px;
			background-color: var(--color-main-1);
			border-radius: 4px;
			z-index: 100;
			animation: timeout var(--timeout-ms) linear;
			animation-play-state: running;
		}

		.count {
			position: absolute;
			top: -9px;
			right: -9px;
			padding: 0.4rem 0.8rem;
			color: var(--color-neutral-1);
			background: var(--color-main-1);
			font-size: 0.9rem;
			font-weight: bold;
			border-radius: 4px;
			z-index: 100;
		}
	}
</style>
