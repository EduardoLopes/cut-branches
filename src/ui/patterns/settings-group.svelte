<script lang="ts">
	import Banner, { type BannerProps } from '@pindoba/svelte-banner';
	import Separator from '@pindoba/svelte-separator';
	import type { Snippet } from 'svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** Group title, shown in the explanation column. */
		heading: string;
		/** What this group controls and why — the left-column copy. */
		description?: BannerProps['subheading'];
		/** `data-testid` for the group root. */
		testId?: string;
		/** The group's controls — typically one pindoba `List` card of rows. */
		children: Snippet;
	}

	const { heading, description, testId, children }: Props = $props();
</script>

<!--
	One block of a settings page: an explanation column on the left (heading +
	description, à la ClickUp) and the controls on the right (a List card of
	label/description/control rows, à la Linear). Groups are divided by a rule;
	`settings-section.svelte` hides the rule above the first group.

	The columns collapse into a single stack when the content column is narrow,
	driven by a container query on `settings-section`'s content wrapper so it
	tracks the pane width, not the window (the settings nav takes 260px).
-->
<section class={css({ display: 'flex', flexDirection: 'column', gap: 'xl' })} data-testid={testId}>
	<Separator data-settings-group-separator />

	<div
		class={css({
			display: 'grid',
			gridTemplateColumns: '1fr',
			// Pin both columns to the top-left: the explanation reads from the top
			// edge of the card beside it, instead of floating to its middle when
			// the card is taller.
			alignItems: 'start',
			gap: 'md',
			'@container settings (min-width: 720px)': {
				gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)',
				gap: 'xl'
			}
		})}
	>
		<Banner headingLevel={2} size="sm" {heading} subheading={description} />

		<div class={css({ display: 'flex', flexDirection: 'column', gap: 'sm', minWidth: '0' })}>
			{@render children()}
		</div>
	</div>
</section>
