<script lang="ts">
	import type { Branch, Repo } from '$lib/stores';
	import { currentRepo, loadingRepoInfo } from '$lib/stores';

	import Delete16 from 'carbon-icons-svelte/lib/Delete16';
	import Information16 from 'carbon-icons-svelte/lib/Information16';
	import DeleteModal from '$lib/DeleteModal/index.svelte';
	import Loading from '$lib/Loading/index.svelte';

	import { getRepoInfo } from '$lib/utils';
	import { repos } from '$lib/stores';
	import { toast } from '@zerodevx/svelte-toast';

	let selected: Branch[] = [];
	let showDeleteModal: boolean = false;

	currentRepo.subscribe(() => {
		selected = [];
	});

	// current branch first
	function sort(a: Branch, b: Branch) {
		if (a.current) {
			return -1;
		}
		if (b.current) {
			return 1;
		}
		// a must be equal to b
		return 0;
	}

	function handleDeleteDone() {
		$loadingRepoInfo = true;

		getRepoInfo($currentRepo.path)
			.then((res: Repo) => {
				$repos = [...$repos.filter((item) => item.path !== res.path), res];
				$currentRepo = res;
			})
			.catch((errors: string[]) => {
				errors.reverse().forEach((item) => toast.push(item));
			})
			.finally(() => {
				$loadingRepoInfo = false;
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
	<Loading show={$loadingRepoInfo} overlay={true} />

	<h1>{$currentRepo.name}</h1>

	<div class="branches">
		{#if $currentRepo.branches}
			{#each $currentRepo.branches.sort(sort) as branch (branch.name)}
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
								<span class="icon"> <Information16 /></span>
								<div>
									This branch is not fully merged into the current branch, {$currentRepo.current_branch}!
								</div>
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

<style src="./styles.scss" lang="scss"></style>
