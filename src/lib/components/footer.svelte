<script lang="ts">
	import ThemeModeSelect from '@pindoba/svelte-theme-mode-select';
	import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';
	import { intlFormat, intlFormatDistance } from 'date-fns';
	import { onDestroy, onMount } from 'svelte';
	import NotificationsPopover from '$lib/components/notifications-popover.svelte';
	import { globalStore } from '$lib/stores/global-store.svelte';
	import { css } from '@pindoba/panda/css';
	import { spacer } from '@pindoba/panda/patterns';

	let now = $state(Date.now());
	let intervalID = 0;

	onMount(() => {
		intervalID = window.setInterval(() => {
			now = Date.now();
		}, 1000);
	});

	onDestroy(() => {
		clearInterval(intervalID);
	});

	const lastUpdatedAt = $derived.by(() => {
		return globalStore.lastUpdatedAt
			? intlFormatDistance(globalStore.lastUpdatedAt, now)
			: undefined;
	});
</script>

<div
	class={css({
		_dark: {
			background: 'neutral.200',
			borderTop: '1px solid token(colors.neutral.100)'
		},
		_light: {
			background: 'neutral.400'
		},
		height: 'calc((token(spacing.sm)) * 2.5)',
		borderLeft: '1px dashed token(colors.primary.300)',
		display: 'flex',
		justifyContent: 'flex-end',
		alignItems: 'center',
		gap: 'md'
	})}
	data-testid="footer"
>
	<div
		class={css({
			_dark: {
				background: 'neutral.400'
			},
			_light: {
				background: 'neutral.600'
			},
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center',
			height: 'calc((token(spacing.sm)) * 2.5)',
			width: '259px',
			p: 'token(spacing.xxs)'
		})}
		data-testid="version-container"
	>
		<div
			class={css({
				fontSize: 'sm',
				_dark: {
					color: 'neutral.900'
				},
				_light: {
					color: 'neutral.900'
				},
				display: 'flex'
			})}
			data-testid="app-version"
		>
			<!-- eslint-disable-next-line -->
			v{__APP_VERSION__}
		</div>
		<div class={spacer()}></div>
		<ThemeModeSelect
			popoverProps={{ placement: 'top' }}
			buttonProps={{
				size: 'xs',
				passThrough: {
					root: css.raw({
						'& svg': {
							width: '14px',
							height: '14px'
						},
						padding: 0,
						_dark: {
							color: 'neutral.900'
						},
						_light: {
							color: 'neutral.900'
						}
					})
				}
			}}
		/>
	</div>
	<div class={spacer()}></div>
	<div
		class={css({
			p: 'token(spacing.xxs)',
			display: 'flex',
			gap: 'xs',
			alignItems: 'center'
		})}
		data-testid="last-updated-container"
	>
		{#if lastUpdatedAt && globalStore.lastUpdatedAt}
			<time
				datetime={globalStore.lastUpdatedAt.toISOString()}
				title={intlFormat(globalStore.lastUpdatedAt, {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
					hour: 'numeric',
					minute: 'numeric',
					second: 'numeric'
				})}
				data-testid="last-updated-time"
			>
				{#key lastUpdatedAt}
					<div
						class={css({
							fontSize: 'sm',
							_dark: {
								color: 'neutral.900'
							},
							_light: {
								color: 'neutral.900'
							}
						})}
						data-testid="last-updated-text"
					>
						Last updated {lastUpdatedAt}
					</div>
				{/key}
			</time>
		{/if}
		<NotificationsPopover />
		{#if import.meta.env.DEV}
			<div
				class={css({
					width: '20px',
					height: '20px',
					'& .tsqd-open-btn-container': {
						position: 'relative !important',
						width: '20px',
						height: '20px',
						left: '0',
						top: '0',
						padding: '0 !important',
						transition: 'fast',
						_hover: {
							filter: 'brightness(1.3)'
						},
						_focus: {
							filter: 'brightness(1.3)'
						},
						_active: {
							filter: 'brightness(0.8)'
						}
					}
				})}
			>
				<SvelteQueryDevtools />
			</div>
		{/if}
	</div>
</div>
