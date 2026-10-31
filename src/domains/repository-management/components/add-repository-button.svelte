<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import LucideCirclePlus from '@lucide/svelte/icons/circle-plus';
	import Button, { type ButtonProps } from '@pindoba/svelte-button';
	import Loading from '@pindoba/svelte-loading';
	import Stamp from '@pindoba/svelte-stamp';
	import { useAddRepository } from '../core/composables/use-add-repository.svelte';
	import type { CreateRepositoryOutput } from '$infrastructure/bindings';
	import Icon from '$ui/core/icon.svelte';
	import { visuallyHidden } from '@pindoba/styled-system/patterns';

	type Props = ButtonProps & {
		icon?: LucideIcon;
		visuallyHiddenLabel?: boolean;
		onSuccess?: (data: CreateRepositoryOutput) => void;
	};

	const {
		size = 'lg',
		emphasis = 'primary',
		icon = LucideCirclePlus,
		visuallyHiddenLabel = false,
		onSuccess,
		...props
	}: Props = $props();

	// Wrapped rather than passed straight through: `onSuccess` is read inside
	// the closure, so a parent that swaps the callback after mount is honoured
	// instead of the composable holding the value it saw on the first render.
	const addRepo = useAddRepository({ onSuccess: (data) => onSuccess?.(data) });
</script>

<Loading loading={addRepo.isPending}>
	{#if visuallyHiddenLabel}
		<Button onclick={addRepo.addFromDialog} {size} {emphasis} shape="square" {...props}>
			<Stamp emphasis="ghost" border="none" background="transparent">
				<Icon {icon} width="20px" height="20px" data-testid="add-button-icon" />
			</Stamp>
			<span class={visuallyHidden()}>Add a git repository</span>
		</Button>
	{:else}
		<Button onclick={addRepo.addFromDialog} {size} {emphasis} {...props}>
			{#snippet leading()}
				<Stamp emphasis="ghost" border="none" background="transparent">
					<Icon {icon} width="20px" height="20px" data-testid="add-button-icon" />
				</Stamp>
			{/snippet}
			Add a git repository
		</Button>
	{/if}
</Loading>
