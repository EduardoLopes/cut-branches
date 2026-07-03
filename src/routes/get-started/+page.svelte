<script lang="ts">
	import OnboardingView from '$domains/onboarding/views/onboarding-view.svelte';
	import AddButton from '$domains/repository-management/components/add-repository-button.svelte';
</script>

<OnboardingView>
	{#snippet actionButton()}
		<AddButton size="lg" emphasis="primary" />
	{/snippet}
</OnboardingView>
