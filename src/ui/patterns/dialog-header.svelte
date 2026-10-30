<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import Banner, { type BannerProps } from '@pindoba/svelte-banner';
	import Stamp from '@pindoba/svelte-stamp';
	import Icon from '$ui/core/icon.svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** Dialog title. */
		title: string;
		/** Supporting line under the title; runs full width beneath the icon. */
		subtitle?: string;
		/** Icon for the leading Stamp, e.g. `LucideFolderGit2` from `@lucide/svelte/icons/folder-git-2`. */
		icon: LucideIcon;
		/** `data-testid` for the subtitle element. */
		subtitleTestId?: string;
	}

	let { title, subtitle, icon, subtitleTestId }: Props = $props();

	const subheadingProps = $derived(
		subtitleTestId ? { props: { 'data-testid': subtitleTestId } } : undefined
	);
</script>

{#snippet stamp()}
	<Stamp
		shape="square"
		size="sm"
		emphasis="secondary"
		tone="neutral"
		background="surface.base"
		border="none"
		shadow="sm"
	>
		<Icon {icon} width="16px" height="16px" />
	</Stamp>
{/snippet}

<!--
	Rendered through the Dialog's `header` snippet in place of its built-in
	Banner, which can't take a `layout`. Same Banner settings as the dialog's
	own (sm, no padding/background/border) plus `leading.span: 'above'`: the
	stamp flanks the title only and the subtitle runs full width beneath both,
	the same convention `page-header` uses. The stamp is a quiet, borderless
	`surface.base` tile so it reads as part of the header rather than a control.
-->
<Banner
	headingLevel={2}
	size="sm"
	padding="none"
	background="transparent"
	border="none"
	heading={title}
	subheading={subtitle}
	leading={stamp as BannerProps['leading']}
	layout={{ root: { align: 'stretch' }, leading: { span: 'above' } }}
	passThrough={{
		root: { style: css.raw({ flex: '1', minWidth: '0' }) },
		subheading: subheadingProps
	}}
	data-testid="dialog-header"
/>
