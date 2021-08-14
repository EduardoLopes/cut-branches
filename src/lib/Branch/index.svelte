<script lang="ts">
	import type { IBranch } from '$lib/stores';
	import { currentRepo } from '$lib/stores';

	import Delete16 from 'carbon-icons-svelte/lib/Delete16';
	import Information16 from 'carbon-icons-svelte/lib/Information16';

	export let showDeletebutton: boolean = false;
	export let onClickDelete: (branch: IBranch) => void = null;
	export let onClick: (branch: IBranch) => void = null;
	export let branch: IBranch;
	export let selected: boolean = false;
	export let disabled: boolean = false;
</script>

<div class="branch-container" title={`${branch.current ? 'Current branch ' : ''}`}>
	<div class="branch" class:current={branch.current} class:selected class:disabled>
		<div
			class="name"
			on:click={() => {
				if (branch.current || disabled) return;

				if (onClick) onClick(branch);
			}}
		>
			{branch.name}
		</div>

		{#if !branch.current && showDeletebutton}
			<div class="menu">
				<button
					class="delete-button"
					on:click={() => {
						if (disabled) return;

						onClickDelete(branch);
					}}
				>
					<Delete16 class="delete-icon" />
				</button>
			</div>
		{/if}
	</div>
	<div class="info">
		{#if branch.fully_merged}
			<div class="grid-2">
				<span class="icon"> <Information16 /></span>
				<div>
					This branch is not fully merged into the current branch, {$currentRepo.current_branch}!
				</div>
			</div>
		{/if}
	</div>
</div>

<style src="./styles.scss" lang="scss"></style>
