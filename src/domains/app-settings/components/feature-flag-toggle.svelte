<script lang="ts">
	import Checkbox from '@pindoba/svelte-checkbox';
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

<div
	class={css({
		display: 'flex',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		gap: 'md',
		paddingY: 'sm'
	})}
	data-testid="feature-flag-toggle"
>
	<div class={css({ display: 'flex', flexDirection: 'column', gap: '2xs', minWidth: '0' })}>
		<span class={css({ fontSize: 'sm', fontWeight: 'medium', color: 'neutral.text.bold' })}>
			{flag.label}
		</span>
		<span class={css({ fontSize: 'xs', color: 'neutral.text.muted' })}>
			{flag.description}
		</span>
	</div>

	<Checkbox
		id={`feature-flag-${flag.key}`}
		checked={enabled}
		onchange={() => onToggle(!enabled)}
		aria-label={flag.label}
		data-testid={`feature-flag-checkbox-${flag.key}`}
	/>
</div>
