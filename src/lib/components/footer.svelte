<script lang="ts">
	import ThemeModeSelect from '@pindoba/svelte-theme-mode-select';
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
			background: 'primary.100',
			borderTop: '1px dashed token(colors.primary.300)'
		},
		_light: {
			background: 'primary.800',
			borderTop: '1px dashed token(colors.primary.400)'
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
				borderTop: '1px dashed token(colors.primary.300)',
				background: 'primary.200'
			},
			_light: {
				borderTop: '1px dashed token(colors.primary.700)',
				background: 'primary.950'
			},
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center',
			height: 'calc((token(spacing.sm)) * 2.5)',
			width: '260px',
			p: 'token(spacing.xxs)'
		})}
		data-testid="version-container"
	>
		<div
			class={css({
				fontSize: 'sm',
				_dark: {
					color: 'primary.900'
				},
				_light: {
					color: 'primary.600'
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
							color: 'primary.900'
						},
						_light: {
							color: 'primary.600'
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
			gap: 'xs'
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
								color: 'primary.900'
							},
							_light: {
								color: 'primary.600'
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
	</div>
</div>
