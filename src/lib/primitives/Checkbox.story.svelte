<script lang="ts">
	import type { Hst } from '@histoire/plugin-svelte';	
	import Checkbox from './Checkbox.svelte';
	export let Hst: Hst;
</script>

<Hst.Story>
	<Hst.Variant title="default">
    <div class="item">
		<Checkbox>Checkbox</Checkbox>
  </div>
	</Hst.Variant>

  <Hst.Variant title="mixed">
    <div class="item ">
		<Checkbox indeterminate={true}>Checkbox</Checkbox>
  </div>
	</Hst.Variant>

  <Hst.Variant title="disabled">
    <div class="item">
		  <Checkbox disabled={true}>Disabled</Checkbox>
    </div>
	</Hst.Variant>

</Hst.Story>

<style lang="scss">
  .item {
    padding: 1rem;
  }
</style>