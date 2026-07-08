<script lang="ts">
	import Icon from '@iconify/svelte';
	import Card, { type PrimitiveCardHeaderProps } from '@pindoba/svelte-card';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Stamp from '@pindoba/svelte-stamp';
	import type { FeatureFlagDefinition } from '$lib/feature-flags.svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		flag: FeatureFlagDefinition;
		/** Current effective value of the flag. */
		enabled: boolean;
		/** Called with the new value when the toggle changes. */
		onToggle: (enabled: boolean) => void;
	}

	const { flag, enabled, onToggle }: Props = $props();
</script>

{#snippet flagIcon()}
	<Stamp
		shape="square"
		size="md"
		emphasis={enabled ? 'secondary' : 'ghost'}
		feedback={enabled ? 'primary' : 'neutral'}
	>
		<Icon icon={flag.icon!} width="18px" height="18px" />
	</Stamp>
{/snippet}

{#snippet toggle()}
	<!--
		`as="span"` renders the checkbox as a label-less indicator so it does not
		nest a second <label> inside the Card's <label> root (nested labels
		double-fire the toggle). The Card's `as="label"` wraps this input, so a
		click anywhere on the card activates it.
	-->
	<Checkbox
		as="span"
		checked={enabled}
		onchange={() => onToggle(!enabled)}
		aria-label={flag.label}
		data-testid={`feature-flag-checkbox-${flag.key}`}
	/>
{/snippet}

<Card
	as="label"
	interactive
	size="sm"
	background={enabled ? 'surface.step.3' : 'surface.step.2'}
	feedback={enabled ? 'primary' : 'neutral'}
	border="default"
	class={css({ cursor: 'pointer', width: '100%' })}
	data-testid="feature-flag-toggle"
	header={{
		layout: { root: { align: 'start' } },
		leading: flag.icon ? (flagIcon as PrimitiveCardHeaderProps['leading']) : undefined,
		heading: flag.label,
		subheading: flag.description,
		trailing: toggle as PrimitiveCardHeaderProps['trailing']
	}}
/>
