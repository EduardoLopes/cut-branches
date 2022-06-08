<script lang="ts">
	import type { IBranch } from '$lib/stores';
	import { currentRepo } from '$lib/stores';

	import Delete16 from 'carbon-icons-svelte/lib/Delete16';
	import Information16 from 'carbon-icons-svelte/lib/Information16';
	import WarningAlt16 from 'carbon-icons-svelte/lib/WarningAlt16';

	export let showDeletebutton: boolean = false;
	export let onClickDelete: (branch: IBranch) => void = null;
	export let onClick: (branch: IBranch) => void = null;
	export let branch: IBranch;
	export let selected: boolean = false;
	export let disabled: boolean = false;
	export let showSelectedWarning = false;

	let protectedWords = [
		'develop',
		'dev',
		'stg',
		'staging',
		'master',
		'hml',
		'master',
		'default',
		'trunk'
	];
</script>

<div
	class="branch-container"
	class:disabled
	class:current={branch.current}
	class:selected
	title={`${branch.current ? 'Current branch ' : ''}`}
>
	<div class="branch">
		<button
			class="name"
			on:click={() => {
				if (branch.current || disabled) return;

				if (onClick) onClick(branch);
			}}
		>
			{branch.name}
		</button>

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
		{#if branch.name.includes('master')}
			<div class="grid-2">
				<span class="icon"> <WarningAlt16 /></span>
				<div>
					The branch name <strong>master</strong> is offensive. Check out this
					<a href="https://sfconservancy.org/news/2020/jun/23/gitbranchname/" target="_blank"
						>article</a
					>
					and make sure to change the branch name to <strong>main</strong>,
					<strong>default</strong>, <strong>truck</strong> or any other word that don't offend others!
				</div>
			</div>
		{/if}
		{#if protectedWords.some( (item) => branch.name.includes(item) ) && (selected || showSelectedWarning)}
			<div class="grid-2">
				<span class="icon"> <WarningAlt16 /></span>
				<div>
					You're selecting a branch with the name <strong>{branch.name}</strong>, review and make
					sure you really wanna delete this branch!
				</div>
			</div>
		{/if}
	</div>
</div>

<style src="./styles.scss" lang="scss"></style>
