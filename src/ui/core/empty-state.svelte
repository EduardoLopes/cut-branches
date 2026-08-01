<script lang="ts">
	import Icon from '@iconify/svelte';
	import Stamp from '@pindoba/svelte-stamp';
	import type { Snippet } from 'svelte';
	import Markdown from 'svelte-exmarkdown';
	import { ensureString } from '$utils/string-utils';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** Short bold title, e.g. "No repositories yet". Plain text. */
		heading?: string;
		/** Primary body copy. Rendered as markdown. */
		message?: string;
		/** Muted supporting line under the message. */
		description?: string;
		icon?: string;
		iconColor?: string;
		/** Call to action rendered under the copy (typically a Button). */
		action?: Snippet;
		/** `md` is the page-level state; `sm` fits inside a panel or list. */
		size?: 'sm' | 'md';
		testId?: string;
	}

	const {
		heading,
		message,
		description,
		icon = 'material-symbols:search-off',
		iconColor,
		action,
		size = 'md',
		testId
	}: Props = $props();

	// Markdown expects a string; callers occasionally hand us an error object.
	const safeMessage = $derived(message === undefined ? undefined : ensureString(message));
</script>

<!--
	The one centered empty/error block. Every page used to hand-roll this — three
	different icon sizes and two different type scales — so the shared version
	carries all the slots those copies needed: heading, markdown body, muted
	description and an action.
-->
<div
	class={css({
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		textAlign: 'center',
		height: '100%',
		width: '100%',
		gap: 'md',
		padding: 'xl'
	})}
>
	<Stamp
		shape="circle"
		size={size === 'sm' ? 'lg' : 'xl'}
		emphasis="ghost"
		border="muted"
		aria-hidden="true"
	>
		<Icon {icon} color={iconColor} />
	</Stamp>

	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			gap: '2xs',
			maxWidth: '48rem'
		})}
	>
		{#if heading}
			<h2
				class={css({
					margin: '0',
					textStyle: size === 'sm' ? 'heading.2xs' : 'heading.xs',
					color: 'neutral.text.bold'
				})}
			>
				{heading}
			</h2>
		{/if}

		{#if safeMessage}
			<div
				class="message {css({
					color: heading ? 'neutral.text.muted' : 'neutral.text',
					fontSize: size === 'sm' ? 'sm' : 'md',
					lineHeight: '1.6'
				})}"
				data-testid={testId}
			>
				<Markdown md={safeMessage} />
			</div>
		{/if}

		{#if description}
			<p class={css({ margin: '0', fontSize: 'sm', color: 'neutral.text.muted' })}>
				{description}
			</p>
		{/if}
	</div>

	{#if action}
		{@render action()}
	{/if}
</div>
