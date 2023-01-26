<script lang="ts">
	import type { Hst } from '@histoire/plugin-svelte';
	import Button from './index.svelte';
	export let Hst: Hst;
</script>

<Hst.Story>
	<Hst.Variant title="default">
		<Button>Default</Button>
		<Button variant="secondary">Secondary</Button>
		<Button variant="tertiary">Tertiary</Button>
	</Hst.Variant>

	<Hst.Variant title="danger">
		<Button feedback="danger">Default</Button>
		<Button variant="secondary" feedback="danger">Secondary</Button>
		<Button variant="tertiary" feedback="danger">Tertiary</Button>
	</Hst.Variant>

	<Hst.Variant title="warning">
		<Button feedback="warning">Default</Button>
		<Button variant="secondary" feedback="warning">Secondary</Button>
		<Button variant="tertiary" feedback="warning">Tertiary</Button>
	</Hst.Variant>

	<Hst.Variant title="success">
		<Button feedback="success">Default</Button>
		<Button variant="secondary" feedback="success">Secondary</Button>
		<Button variant="tertiary" feedback="success">Tertiary</Button>
	</Hst.Variant>

	<Hst.Variant title="info">
		<Button feedback="info">Default</Button>
		<Button variant="secondary" feedback="info">Secondary</Button>
		<Button variant="tertiary" feedback="info">Tertiary</Button>
	</Hst.Variant>

	<Hst.Variant title="disabled">
		<Button state="disabled">Default</Button>
		<Button variant="secondary" state="disabled">Secondary</Button>
		<Button variant="tertiary" state="disabled">Tertiary</Button>
	</Hst.Variant>

	<Hst.Variant title="pressed">
		<Button state="pressed">Default</Button>
		<Button variant="secondary" state="pressed">Secondary</Button>
		<Button variant="tertiary" state="pressed">Tertiary</Button>
	</Hst.Variant>

	<Hst.Variant title="loading">
		<Button state="loading">Default</Button>
		<Button variant="secondary" state="loading">Secondary</Button>
		<Button variant="tertiary" state="loading">Tertiary</Button>
	</Hst.Variant>
	<Hst.Variant title="sizes">
		<Button size="sm">Small</Button>
		<Button size="md">Medium</Button>
		<Button size="lg">Large</Button>
	</Hst.Variant>
</Hst.Story>

<style>
</style>
