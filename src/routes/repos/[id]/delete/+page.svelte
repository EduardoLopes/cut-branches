<script lang="ts">
	import type { IRepo } from '$lib/stores';
	import { repos } from '$lib/stores';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let id = $page.params.id;

	let currentRepo: IRepo | undefined;

	onMount(() => {
		currentRepo = $repos.filter((item) => item.name === id)[0];
	});

	function handleYes() {
		$repos = $repos.filter((item) => item.path !== currentRepo?.path);
		goto(`/`);
	}

	function handleNo() {
		goto(`/repos/${id}`);
	}
</script>

<div class="container">
	<div class="wrapper">
		<div class="header">
			<div class="repoName">{currentRepo?.name}</div>
		</div>
		<div class="question">
			<p><strong>Are you sure do you wanna delete these branches?</strong></p>
			<div>
				<button class="yes" on:click={handleYes}>Yes</button>
				<button class="no" on:click={handleNo}>No</button>
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.container {
		background: #e9e9e7;

		&.show {
			display: block;
		}

		&.hide {
			display: none;
		}
	}

	.wrapper {
		position: relative;
		display: grid;
		grid-template-rows: min-content auto min-content;
		height: 100%;
	}

	.header {
		border-bottom: 1px solid #c0d892;
		background: #c0d892;
		top: 0;
		z-index: 10;
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		min-height: min-content;
		display: flex;
		background: var(--color-primary-1);
		color: #fff;
		text-transform: uppercase;
		font-size: 1.1em;

		.repoName {
			padding: 16px;
		}

		button {
			border: 0;
			padding: 16px 24px;
			color: #fff;
			cursor: pointer;
			background: var(--color-primary-1);
			filter: contrast(1.2);

			&:hover {
				filter: contrast(1.3);
			}
		}
	}

	.branches {
		margin: 8px;
		overflow: auto;
		display: grid;
		grid-auto-rows: min-content;
		gap: 8px;
		padding-right: 8px;
	}

	.question {
		padding: 16px;
		text-align: center;
		border-top: 1px dashed var(--color-gray-1);
		background: rgba(255, 255, 255, 0.5);

		p {
			margin-top: 0;
		}

		button {
			border: none;
			padding: 8px 32px;
			cursor: pointer;
			color: #fff;
			font-size: 1.1rem;
			font-weight: bold;

			&:hover {
				filter: contrast(1.2);
			}

			&:active {
				filter: contrast(1.1);
			}

			&.no {
				background: var(--color-gray-1);
			}

			&.yes {
				background: #f34642;

				&:hover {
					filter: brightness(1.4);
				}

				&:active {
					filter: contrast(1.3);
				}
			}
		}
	}
</style>
