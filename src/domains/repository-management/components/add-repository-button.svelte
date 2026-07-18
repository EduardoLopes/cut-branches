<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button, { type ButtonProps } from '@pindoba/svelte-button';
	import Loading from '@pindoba/svelte-loading';
	import Stamp from '@pindoba/svelte-stamp';
	import { useAddRepository } from '../core/composables/use-add-repository.svelte';
	import type { CreateRepositoryOutput } from '$infrastructure/bindings';
	import { visuallyHidden } from '@pindoba/styled-system/patterns';

	interface Props extends ButtonProps {
		icon?: string;
		visuallyHiddenLabel?: boolean;
		onSuccess?: (data: CreateRepositoryOutput) => void;
	}

	const {
		size = 'lg',
		emphasis = 'primary',
		icon = 'material-symbols:add-circle-outline-rounded',
		visuallyHiddenLabel = false,
		onSuccess,
		...props
	}: Props = $props();

	const addRepo = useAddRepository({ onSuccess });
</script>

<Loading loading={addRepo.isPending}>
	{#if visuallyHiddenLabel}
		<Button onclick={addRepo.addFromDialog} {size} {emphasis} {...props}>
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
