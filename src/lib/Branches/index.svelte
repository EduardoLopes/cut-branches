<script lang="ts">
	import type { Branch as IBranch, Repo } from '$lib/stores';
	import { currentRepo, loadingRepoInfo } from '$lib/stores';

	import DeleteModal from '$lib/DeleteModal/index.svelte';
	import Loading from '$lib/Loading/index.svelte';
	import Branch from '$lib/Branch/index.svelte';

	import { getRepoInfo, toast } from '$lib/utils';
	import { repos } from '$lib/stores';

	let selected: IBranch[] = [];
	let showDeleteModal: boolean = false;

	currentRepo.subscribe(() => {
		selected = [];
	});

	// current branch first
	function sort(a: IBranch, b: IBranch) {
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
				errors.reverse().forEach((item) => toast.failure(item));
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
				<Branch
					{branch}
					showDeletebutton={selected.length === 0}
					selected={selected.some((item) => item === branch)}
					onClick={() => {
						if (selected.some((item) => item.name === branch.name)) {
							selected = selected.filter((item) => item.name !== branch.name);
							return;
						}

						selected.push(branch);
						selected = selected;
					}}
					onClickDelete={() => {
						selected = [branch];
						showDeleteModal = true;
					}}
				/>
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
