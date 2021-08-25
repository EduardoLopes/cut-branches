<script lang="ts">
	import type { IBranch } from '$lib/stores';
	import { repos } from '$lib/stores';
	import { onMount } from 'svelte';
	import DeleteModal from '$lib/DeleteModal/index.svelte';

	export let path: string;

	let apiInvoke;
	let root_path: string;
	let branches: IBranch[];
	let branchSelected: IBranch[] = [];
	let repoName: string;
	let showDeleteModal: boolean = false;

	onMount(async () => {
		const { invoke } = await import('@tauri-apps/api/tauri');

		apiInvoke = invoke;
	});

	function handleBranchClick(branchClicked) {
		if (branches.length <= 1) return;

		const alreadySelected = branchSelected.some((item) => item === branchClicked);
		if (alreadySelected) {
			branchSelected = branchSelected.filter((item) => item !== branchClicked);
		} else {
			branchSelected.push(branchClicked);
		}

		branchSelected = branchSelected;
	}

	function handleDeleteDone() {
		apiInvoke('git_repo_dir', { path }).then((res: string) => {
			const resParser = JSON.parse(res);
			root_path = resParser.root_path;
		});
	}

	function removeRepo() {
		$repos = $repos.filter((item) => item.path !== path);
	}
</script>

{#if showDeleteModal}
	<DeleteModal
		onClose={() => {
			showDeleteModal = false;
		}}
		onDone={handleDeleteDone}
		onYes={() => {
			branchSelected = [];
			showDeleteModal = false;
		}}
		onNo={() => {
			showDeleteModal = false;
		}}
		branches={branchSelected}
		path={root_path}
		{repoName}
		show={showDeleteModal}
	/>
{/if}

{#if root_path}
	<div class="container">
		<div class="rootPath">
			<div class="name">{repoName}</div>
			<div class="remove-repo">
				<button on:click={removeRepo}>X</button>
			</div>
		</div>

		{#if branches}
			<ul class="branches">
				{#each branches as branch}
					<li
						class={branchSelected.some((item) => item === branch) ? 'selected' : ''}
						style={branches.length > 1 ? 'cursor: pointer' : 'cursor: default'}
					>
						<div>
							<div
								class="branch-name"
								on:click={() => {
									handleBranchClick(`${branch}`);
								}}
							>
								{branch}
							</div>
							<div class="button-container">
								{#if branches.length > 1}
									<button
										class={branchSelected.length > 0 ? 'hide' : ''}
										on:click={() => {
											showDeleteModal = true;
											branchSelected.push(branch);
										}}>X</button
									>
								{/if}
							</div>
						</div>
					</li>
				{/each}
				{#if branchSelected.length}
					<li class="delete-all-container" on:click={() => (showDeleteModal = true)}>
						<button>Delete All ({branchSelected.length})</button>
					</li>
				{/if}
			</ul>
		{/if}
	</div>
{/if}

<style src="./styles.scss" lang="scss"></style>
