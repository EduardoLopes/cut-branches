<script lang="ts">
	import Icon from '@iconify/svelte';
	import Banner from '@pindoba/svelte-banner';
	import Button from '@pindoba/svelte-button';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		branchName: string;
		onOverwrite: () => void;
		onSkip: () => void;
	}

	let { branchName, onOverwrite, onSkip }: Props = $props();
</script>

<div
	class={css({
		display: 'flex',
		flexDirection: 'column',
		gap: 'xs',
		background: 'neutral.surface.deep',
		p: 'sm',
		borderRadius: 'lg',
		border: '1px solid token(colors.neutral.border.muted)'
	})}
>
	<Banner feedback="warning" heading="Branch Name Conflict">
		{#snippet leading()}
			<Icon icon="ion:alert-circle" width="24px" height="24px" />
		{/snippet}
	</Banner>
	<p class={css({ color: 'warning.text.accent' })}>
		A branch named <strong>{branchName}</strong> already exists. How would you like to proceed?
	</p>
	<div class={css({ display: 'flex', gap: 'md', marginLeft: 'auto' })}>
		<Button
			feedback="danger"
			emphasis="secondary"
			onclick={onOverwrite}
			data-testid="overwrite-button"
		>
			Overwrite Existing
		</Button>
		<Button emphasis="secondary" onclick={onSkip} data-testid="skip-button">Skip</Button>
	</div>
</div>
