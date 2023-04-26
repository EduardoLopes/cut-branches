<script lang="ts">
	import type { Hst } from '@histoire/plugin-svelte';
	import Flex from './index.svelte';
	export let Hst: Hst;
</script>

<Hst.Story>
	<Hst.Variant title="default">
		<Flex>
			<div class="item" />
			<div class="item" />
			<div class="item" />
			<div class="item" />
			<div class="item" />
			<div class="item" />
		</Flex>
	</Hst.Variant>

	<Hst.Variant title="direction: row">
		<Flex direction="row">
			<div class="item" />
			<div class="item" />
			<div class="item" />
			<div class="item" />
			<div class="item" />
			<div class="item" />
		</Flex>
	</Hst.Variant>

	<Hst.Variant title="align: center">
		<Flex align="center">
			<div class="item" />
			<div class="item" />
			<div class="item" />
			<div class="item" />
		</Flex>
	</Hst.Variant>

	<Hst.Variant title="space-between">
		<Flex justify="space-between" direction="row">
			<div class="item" />
			<div class="item" />
			<div class="item" />
		</Flex>
	</Hst.Variant>

	<Hst.Variant title="gap: 3rem">
		<Flex direction="row" gap="3rem">
			<div class="item" />
			<div class="item" />
			<div class="item" />
			<div class="item" />
			<div class="item" />
			<div class="item" />
		</Flex>
	</Hst.Variant>

	<Hst.Variant title="wrap:wrap">
		<Flex direction="row" gap="3rem" wrap="wrap">
			<div class="item" />
			<div class="item" />
			<div class="item" />
			<div class="item" />
			<div class="item" />
			<div class="item" />
		</Flex>
	</Hst.Variant>
</Hst.Story>

<style>
	.item {
		width: 100px;
		height: 100px;
		background: yellowgreen;
	}
</style>
