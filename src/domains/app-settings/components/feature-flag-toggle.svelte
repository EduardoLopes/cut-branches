<script lang="ts">
	import Icon from '@iconify/svelte';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Stamp from '@pindoba/svelte-stamp';
	import type { Snippet } from 'svelte';
	import type { FeatureFlagDefinition } from '$lib/feature-flags.svelte';
	import SettingsField from '$ui/patterns/settings-field.svelte';
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
		nest a second <label> inside the SettingsField's <label> root (nested labels
		double-fire the toggle). The field's `as="label"` wraps this input, so a
		click anywhere on the row activates it.
	-->
	<Checkbox
		as="span"
		checked={enabled}
		onchange={() => onToggle(!enabled)}
		aria-label={flag.label}
		data-testid={`feature-flag-checkbox-${flag.key}`}
	/>
{/snippet}

<SettingsField
	as="label"
	interactive
	align="start"
	background={enabled ? 'surface.step.3' : 'surface.step.2'}
	feedback={enabled ? 'primary' : 'neutral'}
	class={css({ cursor: 'pointer', width: '100%' })}
	testId="feature-flag-toggle"
	heading={flag.label}
	subheading={flag.description}
	leading={flag.icon ? (flagIcon as Snippet) : undefined}
	control={toggle as Snippet}
/>
