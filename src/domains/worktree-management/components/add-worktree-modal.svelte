<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Modal from '@pindoba/svelte-dialog';
	import Input from '@pindoba/svelte-input';
	import Loading from '@pindoba/svelte-loading';
	import { useAddWorktreeFlow } from '../core/composables/use-add-worktree-flow.svelte';
	import ValidationHint from '$ui/patterns/validation-hint.svelte';
	import { portal } from '$utils/portal-action';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		open?: boolean;
		/** Absolute path to the repository's working directory. */
		repoPath: string;
	}

	let { open = $bindable(false), repoPath }: Props = $props();

	const flow = useAddWorktreeFlow({ getPath: () => repoPath });

	let name = $state('');
	let reference = $state('');
	let lock = $state(false);
	let hintOpen = $state(false);

	// Reset the form whenever the modal opens.
	$effect(() => {
		if (open) {
			name = '';
			reference = '';
			lock = false;
			hintOpen = false;
			flow.reset();
		}
	});

	const validationError = $derived.by(() => {
		if (!name.trim()) return 'Enter a name for the worktree.';
		if (!flow.selectedParent) return 'Choose a directory for the worktree.';
		return null;
	});

	// Clear the hint as soon as the requirements are met.
	$effect(() => {
		if (hintOpen && !validationError) {
			hintOpen = false;
		}
	});

	async function handleConfirm() {
		if (flow.isAdding) return;
		if (validationError) {
			hintOpen = true;
			return;
		}
		const ok = await flow.add({ name, reference, lock });
		if (ok) open = false;
	}
</script>

<div use:portal>
	<Modal
		{open}
		onChange={(next: boolean) => (open = next)}
		title="Add worktree"
		aria-label="Add worktree"
		data-testid="add-worktree-modal"
		showCloseButton={!flow.isAdding}
		passThrough={{
			root: {
				style: css.raw({ width: '520px', maxWidth: 'calc(100vw - token(spacing.2xl))' })
			}
		}}
	>
		<div class={css({ display: 'flex', flexDirection: 'column', gap: 'md', width: 'full' })}>
			<p class={css({ margin: '0', color: 'neutral.text.muted', fontSize: 'sm' })}>
				Create a new working directory linked to this repository. Leave the branch empty to create a
				new branch named after the worktree.
			</p>

			<label class={css({ display: 'flex', flexDirection: 'column', gap: 'xs' })}>
				<span class={css({ fontSize: 'xs', fontWeight: 'medium', color: 'neutral.text.muted' })}>
					Worktree name
				</span>
				<Input
					size="md"
					placeholder="e.g. hotfix"
					aria-label="Worktree name"
					bind:value={name}
					data-testid="add-worktree-name"
				/>
			</label>

			<label class={css({ display: 'flex', flexDirection: 'column', gap: 'xs' })}>
				<span class={css({ fontSize: 'xs', fontWeight: 'medium', color: 'neutral.text.muted' })}>
					Branch (optional)
				</span>
				<Input
					size="md"
					placeholder="existing branch to check out"
					aria-label="Branch to check out"
					bind:value={reference}
					data-testid="add-worktree-reference"
				/>
			</label>

			<div class={css({ display: 'flex', flexDirection: 'column', gap: 'xs' })}>
				<span class={css({ fontSize: 'xs', fontWeight: 'medium', color: 'neutral.text.muted' })}>
					Location
				</span>
				<div class={css({ display: 'flex', alignItems: 'center', gap: 'sm' })}>
					<Button
						size="sm"
						emphasis="secondary"
						onclick={() => flow.pickDirectory()}
						data-testid="add-worktree-pick-dir"
					>
						{#snippet leading()}<Icon icon="lucide:folder" width="14px" height="14px" />{/snippet}
						Choose directory…
					</Button>
					<span
						class={css({
							fontSize: 'xs',
							color: 'neutral.text.muted',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap'
						})}
						data-testid="add-worktree-selected-dir"
					>
						{flow.selectedParent
							? `${flow.selectedParent}/${name.trim() || '…'}`
							: 'No directory chosen'}
					</span>
				</div>
			</div>

			<Checkbox
				id="add-worktree-lock"
				checked={lock}
				onchange={() => (lock = !lock)}
				data-testid="add-worktree-lock"
			>
				Lock after creating
			</Checkbox>

			<div
				class={css({
					display: 'flex',
					justifyContent: 'flex-end',
					gap: 'sm',
					paddingTop: 'md',
					borderTopWidth: '1px',
					borderTopStyle: 'solid',
					borderTopColor: 'neutral.border.muted'
				})}
			>
				<Button
					emphasis="ghost"
					onclick={() => (open = false)}
					disabled={flow.isAdding}
					data-testid="add-worktree-cancel"
				>
					Cancel
				</Button>
				<ValidationHint
					bind:open={hintOpen}
					message={validationError ?? ''}
					data-testid="add-worktree-validation"
				>
					{#snippet trigger(triggerProps)}
						<Loading loading={flow.isAdding} variant="busy" indicator>
							<Button
								{...triggerProps}
								emphasis="primary"
								onclick={handleConfirm}
								data-testid="add-worktree-confirm"
							>
								Create worktree
							</Button>
						</Loading>
					{/snippet}
				</ValidationHint>
			</div>
		</div>
	</Modal>
</div>
