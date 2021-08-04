<script lang="ts">
	import type { Branch, Repo } from '$lib/stores';
	import { currentRepo } from '$lib/stores';
	import { onMount } from 'svelte';
	import Delete16 from 'carbon-icons-svelte/lib/Delete16';
	import Information16 from 'carbon-icons-svelte/lib/Information16';
	import DeleteModal from '$lib/DeleteModal/index.svelte';

	import { getRepoInfo } from '$lib/utils';
	import { repos } from '$lib/stores';

	let selected: Branch[] = [];
	let showDeleteModal: boolean = false;

	currentRepo.subscribe(() => {
		selected = [];
	});

	function handleDeleteDone() {
		getRepoInfo($currentRepo.path)
			.then((res: Repo) => {
				$repos = [...$repos.filter((item) => item.path !== res.path), res];
				$currentRepo = res;
			})
			.catch((error) => {
				console.log(error);
			});
	}
</script>

{#if showDeleteModal}
	<DeleteModal
		onClose={() => {
			showDeleteModal = false;
		}}
		onDone={handleDeleteDone}
		onYes={() => {
			selected = [];
			showDeleteModal = false;
		}}
		onNo={() => {
			showDeleteModal = false;
			if (selected.length === 1) {
				selected = [];
			}
		}}
		branches={selected}
		path={$currentRepo.path}
		repoName={$currentRepo.name}
		show={showDeleteModal}
	/>
{/if}

<main class="container">
	<h1>{$currentRepo.name}</h1>

	<div class="branches">
		{#if $currentRepo.branches}
			{#each $currentRepo.branches as branch (branch.name)}
				<div class="branch-container" title={`${branch.current ? 'Current branch ' : ''}`}>
					<div
						class="branch"
						class:current={branch.current}
						class:selected={selected.some((item) => item === branch)}
					>
						<div
							class="name"
							on:click={() => {
								if (branch.current) return;

								if (selected.some((item) => item.name === branch.name)) {
									selected = selected.filter((item) => item.name !== branch.name);
									return;
								}

								selected.push(branch);
								selected = selected;
							}}
						>
							{branch.name}
						</div>
						{#if selected.length === 0}
							{#if !branch.current}
								<div class="menu">
									<button
										class="delete-button"
										on:click={() => {
											selected = [branch];
											console.log(selected);
											showDeleteModal = true;
										}}
									>
										<Delete16 class="delete-icon" />
									</button>
								</div>
							{/if}
						{/if}
					</div>
					<div class="info">
						{#if branch.fully_merged}
							<div class="grid-2">
								<span class="icon"> <Information16 /></span> This branch is not fully merged!
							</div>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
		{#if selected.length > 0}
			<button class="delete-all" on:click={() => (showDeleteModal = true)}>
				Delete {#if selected.length > 1}all ({selected.length}){/if}</button
			>
		{/if}
	</div>
</main>

<style>
	.container {
		background: #e9e9e7;
		padding: 16px;
		height: 100vh;
		overflow: hidden;
	}

	h1 {
		font-size: 1.5em;
		margin: 0;
		text-align: left;
		text-transform: uppercase;
		margin-bottom: 16px;
	}

	.branches {
		display: grid;
		overflow-y: auto;
		height: calc(100% - 29px - 16px);
		grid-auto-rows: min-content;
		row-gap: 0;
		border: 1px dashed var(--color-gray);
	}

	.delete-all {
		position: sticky;
		bottom: 0;
		background: #f34642;
		padding: 16px;
		color: #fff;
		border: 0;
		cursor: pointer;
	}

	.branch-container {
		background: rgba(255, 255, 255, 0.7);
		font-size: 0.9em;
		margin-bottom: 8px;
	}

	.branch {
		display: grid;
		grid-template-columns: auto min-content;
		cursor: pointer;
	}

	.info .grid-2 {
		display: grid;
		grid-template-columns: min-content auto;
		padding: 8px;
		align-items: center;
		font-size: 0.7rem;
		border-top: 1px dashed var(--color-gray);
	}

	.info .grid-2 .icon {
		display: flex;
		margin-right: 8px;
		align-items: center;
	}

	.branch-container .name {
		padding: 14px;
	}

	.branch-container .menu {
		display: none;
		align-items: center;
	}

	.branch:hover > .menu {
		display: flex;
	}

	:global(svg.delete-icon) {
		fill: rgba(0, 0, 0, 0.5);
	}

	.delete-button {
		padding: 8px 12px;
		height: 100%;
		border: 0;
		background: transparent;
		border-left: 1px dashed var(--color-gray);
		cursor: pointer;
	}

	.delete-button:hover {
		background: rgb(255, 209, 209);
	}

	.branch.current {
		border-left: 4px solid var(--color-primary-1);
		cursor: default;
	}

	.branch.current:hover {
		background: rgba(255, 255, 255, 0.7);
		border-left: 4px solid var(--color-primary-1);
		cursor: default;
	}

	.branch.selected {
		background: var(--color-primary-2);
	}

	.branch.selected:hover {
		background: var(--color-primary-2);
		filter: contrast(1.2);
	}

	.branch:hover {
		background: rgba(255, 255, 255, 1);
	}
</style>
