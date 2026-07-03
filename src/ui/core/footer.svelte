<script lang="ts">
	import Icon from '@iconify/svelte';
	import Attachment from '@pindoba/svelte-attachment';
	import Button from '@pindoba/svelte-button';
	import Panel from '@pindoba/svelte-panel';
	import Stamp from '@pindoba/svelte-stamp';
	import ThemeModeSelect from '@pindoba/svelte-theme-mode-select';
	import { $unreadCount as unreadCountAtom, toggleCenter } from '@pindoba/svelte-toast';
	import Tooltip from '@pindoba/svelte-tooltip';
	import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';
	import { intlFormat, intlFormatDistance } from 'date-fns';
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/state';
	import { createGetRepositoryQuery } from '$infrastructure/queries/create-get-repository-query';
	import { css } from '@pindoba/styled-system/css';
	import { spacer, visuallyHidden } from '@pindoba/styled-system/patterns';

	let unread = $state(0);
	let ringKey = $state(0);
	$effect(() =>
		unreadCountAtom.subscribe((v) => {
			if (v > unread) ringKey += 1;
			unread = v;
		})
	);

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

	const repositoryQuery = createGetRepositoryQuery(() => ({ id: page.params.id ?? '' }));

	const lastUpdatedAtDate = $derived.by(() => {
		const raw = repositoryQuery.data?.lastSyncedAt;
		if (!raw) return undefined;
		// chrono::NaiveDateTime serializes without a timezone, but we always
		// store UTC server-side. Tag it explicitly so JS parses as UTC.
		return new Date(raw.endsWith('Z') ? raw : `${raw}Z`);
	});

	const lastUpdatedAt = $derived.by(() => {
		return lastUpdatedAtDate ? intlFormatDistance(lastUpdatedAtDate, now) : undefined;
	});
</script>

<Panel
	background="surface.deep"
	radius="none"
	class={css({
		marginTop: 'auto',
		borderTop: '1px solid token(colors.neutral.border.muted)',
		display: 'flex',
		flexDirection: 'row',
		p: 'none',
		justifyContent: 'flex-end',
		alignItems: 'center',
		gap: 'md'
	})}
	data-testid="footer"
>
	<Panel
		background="surface.soft"
		radius="none"
		padding="none"
		class={css({
			display: 'flex',
			flexDirection: 'row',
			justifyContent: 'center',
			alignItems: 'center',
			height: 'calc((token(spacing.sm)) * 2.5)',
			width: '261px',
			alignSelf: 'stretch',
			borderRight: '1px solid token(colors.neutral.border.muted)',
			p: 'token(spacing.2xs)'
		})}
		data-testid="version-container"
	>
		<div
			class={css({
				fontSize: 'sm',
				color: 'neutral.text.muted',
				display: 'flex',
				width: 'full'
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
					root: {
						style: css.raw({
							color: 'neutral.text.muted',
							'& svg': {
								width: '14px',
								height: '14px'
							}
						})
					}
				}
			}}
		/>
	</Panel>
	<div class={spacer()}></div>
	<Panel
		background="transparent"
		class={css({
			display: 'flex',
			flexDirection: 'row',
			gap: 'xs',
			width: 'auto',
			alignItems: 'center',
			flexShrink: '0',
			alignSelf: 'stretch'
		})}
		padding="none"
	>
		{#if lastUpdatedAt && lastUpdatedAtDate}
			<time
				datetime={lastUpdatedAtDate.toISOString()}
				title={intlFormat(lastUpdatedAtDate, {
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
							color: 'neutral.text.muted'
						})}
						data-testid="last-updated-text"
					>
						Last updated {lastUpdatedAt}
					</div>
				{/key}
			</time>
		{/if}
		<Tooltip content="Notifications">
			{#snippet children(triggerProps)}
				<Attachment placement="top-end" anchor="corner" shape="rect">
					<Button
						emphasis="ghost"
						size="xs"
						shape="square"
						onclick={() => toggleCenter()}
						data-testid="notifications-trigger"
						aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
						{...triggerProps}
					>
						{#key ringKey}
							<span
								class={css({
									display: 'inline-flex',
									transformOrigin: 'top center',
									animation:
										unread > 0
											? 'bellRing 800ms ease-in-out, pulse 2s ease-in-out 800ms infinite'
											: 'none'
								})}
								aria-hidden="true"
							>
								<Stamp emphasis="ghost" border="none" background="transparent">
									<Icon icon="mingcute:notification-fill" width="12px" height="12px" />
								</Stamp>
							</span>
						{/key}
						<span class={visuallyHidden()}>
							{unread > 0 ? `${unread} unread notifications` : 'Notifications'}
						</span>
					</Button>
					{#snippet content()}
						{#if unread > 0}
							<span
								class={css({
									minWidth: '14px',
									height: '14px',
									px: '4xs',
									borderRadius: 'full',
									background: 'danger.surface.deep',
									color: 'danger.text.contrast',
									fontSize: '9px',
									fontWeight: 'bold',
									lineHeight: '1',
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									pointerEvents: 'none'
								})}
								data-testid="notifications-badge"
							>
								{unread > 99 ? '99+' : unread}
							</span>
						{/if}
					{/snippet}
				</Attachment>
			{/snippet}
		</Tooltip>
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
	</Panel>
</Panel>
