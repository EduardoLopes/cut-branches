<script lang="ts">
	import Icon from '@iconify/svelte';
	import Banner, { type BannerProps } from '@pindoba/svelte-banner';
	import Stamp from '@pindoba/svelte-stamp';
	import IconButton from '$ui/core/icon-button.svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** When true, the header collapses to a narrow rail showing only the brand mark. */
		collapsed?: boolean;
		/** Fired when the collapse/expand toggle is clicked. Omit to hide the toggle. */
		onToggle?: () => void;
	}

	const { collapsed = false, onToggle }: Props = $props();
</script>

{#snippet logo()}
	<Stamp
		size="md"
		shape="circle"
		emphasis="primary"
		feedback="primary"
		shadow="md"
		aria-hidden="true"
	>
		<Icon icon="game-icons:tree-branch" />
	</Stamp>
{/snippet}

{#snippet toggle()}
	<IconButton
		size="sm"
		shape="square"
		emphasis="ghost"
		icon={collapsed ? 'lucide:panel-left-open' : 'lucide:panel-left-close'}
		label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
		visuallyHiddenLabel
		aria-expanded={!collapsed}
		onclick={onToggle}
	/>
{/snippet}

{#if collapsed}
	<div
		class={css({
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: 'sm',
			padding: 'md'
		})}
	>
		{@render logo()}
		{#if onToggle}{@render toggle()}{/if}
	</div>
{:else}
	<Banner
		padding="md"
		leading={logo as BannerProps['leading']}
		trailing={onToggle ? (toggle as BannerProps['trailing']) : undefined}
		heading="Cut Branches"
		passThrough={{
			heading: {
				style: css.raw({
					color: 'primary.800',
					letterSpacing: 'tight',
					_dark: { color: 'primary.950' }
				})
			}
		}}
	/>
{/if}
