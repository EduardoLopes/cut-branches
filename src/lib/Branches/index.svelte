<script lang="ts">
	import type { IBranch } from '$lib/stores';

	import { getRepoInfo, toast } from '$lib/utils';
	import { repos } from '$lib/stores';
	import Button from '$lib/primitives/Button/index.svelte';
	import Icon from '@iconify/svelte';
	import Checkbox from '$lib/primitives/Checkbox.svelte';
	import { navigating } from '$app/stores';

	let selected: string[] = [];
	export let id: string | null = null;

	$: currentRepo = $repos.filter((item) => item.name === id)[0];
	$: if ($navigating) selected = [];

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
				});
		}
	}
</script>

<main class="container">
	<div class="header">
		<h1>{currentRepo.name}</h1>
		<div class="menu">
			<Button variant="tertiary" size="sm" on:click={update_repo}>
				<Icon
					icon="material-symbols:refresh-rounded"
					width="24px"
					height="24px"
					color="var(--primary-color)"
				/>
			</Button>
			<a href={`/repos/${currentRepo.name}/remove`}>
				<Button variant="tertiary" size="sm">
					<Icon
						icon="solar:close-circle-linear"
						width="24px"
						height="24px"
						color="var(--primary-color)"
					/>
				</Button>
			</a>
		</div>
	</div>

	<div class="toolbar-container">
		<div class="checkbox">
			<Checkbox
				visuallyHideLabel
				indeterminate={selected.length !== currentRepo.branches.length && selected.length > 0}
				on:click={(e) => {
					const indeterminate =
						selected.length !== currentRepo.branches.length && selected.length > 0;

					if (indeterminate || selected.length === 0) {
						selected = currentRepo.branches.map((item) => item.name);
					} else {
						selected = [];
					}
				}}
				checked={selected.length === currentRepo.branches.length}>Select all</Checkbox
			>

			{selected.length} / {currentRepo.branches.length} branches selected
		</div>
		{#if selected.length > 0}
			<div class="toolbar">
				<a href={`/repos/${currentRepo.name}/branches/delete?branches=${selected.join(',')}`}>
					<Button variant="primary" feedback="danger" size="sm">
						<Icon
							icon="ion:trash-outline"
							width="16px"
							height="16px"
							color="var(--primary-color)"
						/>
						Delete
					</Button>
				</a>
			</div>
		{/if}
	</div>

	<div class="branches">
		{#each currentRepo.branches.sort(sort) as branch, index}
			<div class="branch-container" class:selected={selected.includes(branch.name)}>
				<div class="checkbox">
					<Checkbox
						visuallyHideLabel
						on:click={(e) => {
							if (selected.includes(branch.name)) {
								selected = selected.filter((item) => item !== branch.name);
							} else {
								selected = [...selected, branch.name];
							}
						}}
						checked={selected.includes(branch.name)}
					>
						{branch.name}
					</Checkbox>
				</div>

				<div class="branche">
					<span class="name">
						{branch.name}
					</span>
				</div>
			</div>
		{/each}
	</div>
</main>

<style lang="scss">
	.transition {
		transition-timing-function: ease-in-out;
		transition-duration: 0.1s;
		transition-property: width, height, border, color, background, padding, font-size;
	}
	.container {
		background: var(--color-neutral-2);
		overflow: hidden;
		position: relative;
		height: 100%;
	}

	.toolbar-container {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.6rem;
		padding-bottom: 0;
		height: 50px;

		.checkbox {
			display: flex;
			align-items: center;
			height: 100%;
			gap: 1.6rem;
		}
	}

	.branch-container {
		display: grid;
		grid-template-columns: min-content auto;
		gap: 1.6rem;
		border-radius: 4px;

		&.selected {
			.branche {
				border-color: var(--color-danger-2);
				border-style: dashed;
				.name {
					color: var(--color-danger-3);
				}
			}
		}

		.branche {
			background: var(--color-neutral-4);
			border: 1px solid var(--color-neutral-7);
			padding: 1.6rem;
			border-radius: 4px;

			.name {
				color: var(--color-neutral-12);
				font-weight: 600;
			}

			@extend .transition;
		}
	}

	.branches {
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		grid-auto-rows: max-content;
		gap: 1.6rem;
		border: 1px dashed var(--color-gray);
		padding: 16px;
		height: calc(100vh - 57px);
	}

	.header {
		display: flex;
		justify-content: space-between;
		background: var(--color-neutral-2);
		top: 0;
		border-bottom: 1px dashed var(--color-neutral-8);

		h1 {
			font-size: 1.3em;
			margin: 0;
			text-align: left;
			text-transform: uppercase;
			font-weight: bold;
			padding: 1.6rem;
		}

		.menu {
			display: flex;
			// margin-right: 1.6rem;
			align-items: center;

			:global {
				button,
				a {
					border-radius: 0;
					height: 100%;
					align-items: center;
					justify-content: center;
					width: 57px;
				}
			}
		}
	}
</style>
