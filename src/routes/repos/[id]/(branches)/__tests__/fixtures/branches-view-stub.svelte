<script lang="ts">
	const { id, context }: { id: string; context: string } = $props();
</script>

<div data-testid="branches-view" data-id={id} data-context={context}></div>
