<script lang="ts">
	import type { IBranch, IRepo } from '$lib/stores';
	import { loadingRepoInfo } from '$lib/stores';

	import DeleteModal from '$lib/DeleteModal/index.svelte';
	import Modal from '$lib/Modal/index.svelte';
	import Loading from '$lib/Loading/index.svelte';
	import Branch from '$lib/Branch/index.svelte';

	import { getRepoInfo, toast } from '$lib/utils';
	import { repos } from '$lib/stores';
	import Rotate16 from 'carbon-icons-svelte/lib/Rotate.svelte';
	import CloseOutline16 from 'carbon-icons-svelte/lib/CloseOutline.svelte';

	let selected: IBranch[] = [];
	let showDeleteModal: boolean = false;
	let showDeleteRepoModal: boolean = false;
	export let id: string | null = null;

	let currentRepo: IRepo | undefined = $repos.filter((item) => item.name === id)[0];

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

	function update_repo() {
		$loadingRepoInfo = true;

		if (currentRepo) {
			getRepoInfo(currentRepo.path)
				.then((res) => {
					if (res) {
						$repos = [...$repos.filter((item) => item.path !== res.path), res];
						currentRepo = res;
					}
				})
				.catch((errors: string[]) => {
					errors.reverse().forEach((item) => toast.failure(item));
				})
				.finally(() => {
					$loadingRepoInfo = false;
				});
		}
	}
</script>

{#if showDeleteModal && currentRepo}
	<DeleteModal
		onClose={() => {
			showDeleteModal = false;
		}}
		onDone={update_repo}
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
		path={currentRepo.path}
		repoName={currentRepo.name}
		show={showDeleteModal}
	/>
{/if}

<Modal
	title={`Remove ${currentRepo?.name}`}
	question={'Are you sure you wanna remove this repository'}
	onYes={() => {
		$repos = $repos.filter((item) => item.path !== currentRepo.path);
		currentRepo = $repos[0] || null;
		showDeleteRepoModal = false;
	}}
	onNo={() => {
		showDeleteRepoModal = false;
	}}
	show={showDeleteRepoModal}
/>

{#if currentRepo}
	<main class="container">
		<Loading show={$loadingRepoInfo} overlay={true} />

		<div class="header">
			<h1>{currentRepo.name}</h1>
			<div class="menu">
				<button class="button" on:click={update_repo}>
					<Rotate16 class="icon" />
				</button>
				<button
					class="button"
					on:click={() => {
						showDeleteRepoModal = true;
					}}
				>
					<CloseOutline16 class="icon" />
				</button>
			</div>
		</div>

		<div class="branches">
			{#if currentRepo.branches}
				{#each currentRepo.branches.sort(sort) as branch (branch.name)}
					<Branch
						{branch}
						showDeletebutton={selected.length === 0}
						selected={selected.some((item) => item === branch)}
						disabled={branch.current}
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
{/if}

<style src="./styles.scss" lang="scss"></style>
