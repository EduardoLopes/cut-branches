<script lang="ts">
	import Icon from '@iconify/svelte';
	import Alert from '@pindoba/svelte-alert';
	import Button from '@pindoba/svelte-button';
	import Loading from '@pindoba/svelte-loading';
	import Markdown from 'svelte-exmarkdown';
	import type { Branch } from '$domains/branch-management/core/models/branch';
	import type { ConflictResolution, RestoreBranchResult } from '$lib/bindings';
	import BranchCard from '$ui/core/branch-card.svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		branch: Branch;
		result: RestoreBranchResult | undefined;
		isPending: boolean;
		isCurrentConflict: boolean;
		isInFlight: boolean;
		existsAlready: boolean;
		preference: ConflictResolution | undefined;
		isProcessing: boolean;
		onSetPreference: (resolution: ConflictResolution) => void;
	}

	let {
		branch,
		result,
		isPending,
		isCurrentConflict,
		isInFlight,
		existsAlready,
		preference,
		isProcessing,
		onSetPreference
	}: Props = $props();

	const status = $derived.by(() => {
		if (!result) return { icon: 'ion:ellipse-outline', color: 'gray.500' as const };
		if (result.success) return { icon: 'ion:checkmark-circle', color: 'success' as const };
		if (result.requiresUserAction) return { icon: 'ion:alert-circle', color: 'warning' as const };
		return { icon: 'ion:close-circle', color: 'danger' as const };
	});

	// Show the spinner whenever this row's mutation is in flight, OR when the
	// flow is processing and we don't yet have a result and the row isn't
	// waiting for the user to act.
	const showLoading = $derived(
		!isCurrentConflict && (isInFlight || (isProcessing && !result && !isPending))
	);
</script>

<div class={css({ position: 'relative' })}>
	<div class={css({ '& > div': { marginBottom: '0' } })}>
		<Loading loading={showLoading} passThrough={{ root: { style: css.raw({ width: '100%' }) } }}>
			<div
				class={css({
					display: 'flex',
					flexDirection: 'column',
					gap: 'sm',
					width: 'full',
					background: 'neutral.surface.deep',
					p: 'sm',
					borderRadius: 'lg'
				})}
			>
				{#if result}
					<div
						class={[
							css({
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'flex-end',
								gap: 'xs'
							}),
							status.color === 'success' && css({ color: 'success.800' }),
							status.color === 'warning' && css({ color: 'warning.800' }),
							status.color === 'danger' && css({ color: 'danger.800' })
						]}
					>
						<span class={css({ fontSize: 'xs', flexDirection: 'row' })}>
							{result.skipped ? 'Skipped' : ''}
							{isPending ? 'Pending resolution' : ''}
						</span>
						<Icon icon={status.icon} width="20px" height="20px" />
					</div>
				{/if}
				<BranchCard {branch} />
				{#if !isProcessing && existsAlready}
					<div
						class={css({
							display: 'flex',
							alignItems: 'center',
							gap: 'md',
							padding: 'xs',
							backgroundColor: 'warning.50',
							borderRadius: 'md'
						})}
						data-testid="branch-conflict-warning"
					>
						<Icon icon="ion:alert-circle" width="16px" height="16px" color="#f59e0b" />
						<span class={css({ fontSize: 'sm', color: 'warning.800' })}>
							Branch already exists
						</span>
						<div class={css({ marginLeft: 'auto', display: 'flex', gap: 'xs' })}>
							<Button
								size="xs"
								emphasis={preference === 'Skip' ? 'primary' : 'secondary'}
								onclick={() => onSetPreference('Skip')}
								data-testid="pre-skip-button"
							>
								Skip
							</Button>
							<Button
								size="xs"
								feedback="danger"
								emphasis={preference === 'Overwrite' ? 'primary' : 'secondary'}
								onclick={() => onSetPreference('Overwrite')}
								data-testid="pre-overwrite-button"
							>
								Overwrite
							</Button>
						</div>
					</div>
				{/if}
				{#if isPending && !isCurrentConflict}
					<div
						class={css({
							padding: 'xs',
							backgroundColor: 'warning.50',
							borderRadius: 'md',
							fontSize: 'sm',
							color: 'warning.800'
						})}
					>
						Waiting for user resolution...
					</div>
				{/if}
				{#if result?.message}
					<Alert feedback="warning">
						<Markdown md={result.message} />
					</Alert>
				{/if}
			</div>
		</Loading>
	</div>
</div>
