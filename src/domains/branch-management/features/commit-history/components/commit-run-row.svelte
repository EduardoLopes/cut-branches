<script lang="ts">
	// Fallback row for a run with NO commit row above it to host the gutter
	// toggle (start of the list): a compact full-width divider strip with the
	// toggle label — collapsed ("Show N commits") or an expanded run's header
	// ("Hide N commits"). The WHOLE row is the click target — the parent row
	// wrapper owns the click/keyboard handling; this component is purely
	// visual.
	import Icon from '@iconify/svelte';
	import Stamp from '@pindoba/svelte-stamp';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		mode: 'collapsed' | 'header';
		count: number;
	}

	let { mode, count }: Props = $props();

	const runStrip = css({
		flex: '1',
		minWidth: '0',
		display: 'flex',
		alignItems: 'center',
		gap: 'sm',
		px: 'md',
		height: 'full',
		fontSize: 'xs',
		color: 'neutral.text.muted'
	});
	const dividerLine = css({
		flex: '1',
		height: '1px',
		background: 'neutral.border.muted'
	});
	// The floating toggle chip: sits on top of the hairline, lifts on row hover.
	const pill = css({
		flex: '0 0 auto',
		display: 'inline-flex',
		alignItems: 'center',
		gap: 'xs',
		px: 'sm',
		py: '2xs',
		borderRadius: 'full',
		border: '1px solid',
		borderColor: 'neutral.border.muted',
		background: 'neutral.surface.step.1',
		boxShadow: 'sm',
		whiteSpace: 'nowrap'
	});
</script>

<div class={runStrip}>
	<span class={dividerLine}></span>
	<span class={pill}>
		<Stamp emphasis="ghost" border="none" background="transparent">
			<Icon
				icon={mode === 'collapsed' ? 'lucide:chevrons-up-down' : 'lucide:chevrons-down-up'}
				width="14px"
				height="14px"
			/>
		</Stamp>
		{mode === 'collapsed' ? `Show ${count} commits` : `Hide ${count} commits`}
	</span>
	<span class={dividerLine}></span>
</div>
