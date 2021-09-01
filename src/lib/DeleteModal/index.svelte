<script lang="ts">
	import type { IBranch } from '$lib/stores';
	import { deleteBranches, toast } from '$lib/utils';
	import Branch from '$lib/Branch/index.svelte';
	import { onMount } from 'svelte';

	export let show;
	export let path;
	export let repoName;
	export let onClose;
	export let onYes;
	export let onDone;
	export let onNo;
	export let branches: IBranch[];

	async function handleYes() {
		if (onYes) onYes();
		document.body.style.overflow = 'auto';

		deleteBranches(path, branches)
			.then((res) => {
				if (onDone) onDone();

				// FIXME: turn this back on, when the notifications problems be fixed
				// res.result.forEach((item) => toast.success(item));
			})
			.catch((errors: string[]) => {
				errors.reverse().forEach((item) => toast.failure(item));
			});
	}

	function handleNo() {
		if (onNo) onNo();
		document.body.style.overflow = 'auto';
	}

	onMount(() => {
		document.body.style.overflow = 'hidden';
	});
</script>

<div class="overlay" />
<div class="container" class:show class:hide={!show}>
	<div class="wrapper">
		<div class="header">
			<div class="repoName">{repoName}</div>
			<button
				on:click={() => {
					if (onClose) onClose();
					document.body.style.overflow = 'auto';
				}}
				class="close">X</button
			>
		</div>
		{#if branches}
			<div class="branches">
				{#each branches as branch (branch.name)}
					<Branch {branch} disabled={true} showSelectedWarning={true} />
				{/each}
			</div>
		{/if}
		<div class="question">
			<p><strong>Are you sure do you wanna delete these branches?</strong></p>
			<div>
				<button class="yes" on:click={handleYes}>Yes</button>
				<button class="no" on:click={handleNo}>No</button>
			</div>
		</div>
	</div>
</div>

<style src="./styles.scss" lang="scss"></style>
