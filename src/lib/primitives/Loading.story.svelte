<script lang="ts">
	import type { Hst } from '@histoire/plugin-svelte';
	import Alert from './Alert.svelte';
	import Flex from './Flex/index.svelte';
	import Group from './Group.svelte';
	import Loading, { type LoadingFeedback, type LoadingSize, type LoadingVariant } from './Loading.svelte';
	export let Hst: Hst;

	let variant: LoadingVariant = 'primary';
	let variantOptions = [
		{ value: 'primary', label: 'primary' },
		{ value: 'secondary', label: 'secondary' },
	];

	let feedback: LoadingFeedback = 'normal';
	let feedbackOptions = [
		{ value: 'danger', label: 'danger' },
		{ value: 'info', label: 'info' },
		{ value: 'normal', label: 'normal' },
		{ value: 'success', label: 'success' },
		{ value: 'warning', label: 'warning' }
	];

	let size: LoadingSize = 'md';
	let sizeOptions = [
		{ value: 'sm', label: 'sm' },
		{ value: 'md', label: 'md' },
		{ value: 'lg', label: 'lg' },
		{ value: 'xl', label: 'xl' },
		{ value: 'xxl', label: 'xxl' },
		{ value: 'xxxl', label: 'xxxl' }
	];

  let showIcon: boolean = true;
	let isLoading = true;

</script>

<Hst.Story>
	<svelte:fragment slot="controls">
		<Hst.Radio bind:value={variant} bind:options={variantOptions} title="Variant" />
		<Hst.Radio bind:value={feedback} bind:options={feedbackOptions} title="Feedback" />
		<Hst.Radio bind:value={size} bind:options={sizeOptions} title="Size" />
    <Hst.Checkbox bind:value={isLoading} title="Loading" />
	</svelte:fragment>

	<Hst.Variant title="default variants">
    <Flex gap="1.6rem">		
			<Loading state={isLoading ? "loading" : "normal"} {feedback} {size} {variant} />      
    </Flex>
	</Hst.Variant>

  <Hst.Variant title="group">
    <Flex gap="1.6rem">
			<Loading state={isLoading ? "loading" : "normal"} {feedback} {size} {variant}>
				<Group>
					<Alert size={"lg"} {showIcon}> Lorem ipsum dolor, sit amet consectetur adipisicing elit. Et quo, eveniet corporis fugiat minus doloribus aperiam impedit magni dolor quidem iusto, cupiditate explicabo maxime aut sed consequatur dolorum quam esse! </Alert>
					<Alert variant="secondary" size={"lg"} {showIcon}> Lorem ipsum dolor, sit amet consectetur adipisicing elit. Et quo, eveniet corporis fugiat minus doloribus aperiam impedit magni dolor quidem iusto, cupiditate explicabo maxime aut sed consequatur dolorum quam esse! </Alert>
					<Alert variant="secondary" size={"lg"} {showIcon}> Lorem ipsum dolor, sit amet consectetur adipisicing elit. Et quo, eveniet corporis fugiat minus doloribus aperiam impedit magni dolor quidem iusto, cupiditate explicabo maxime aut sed consequatur dolorum quam esse! </Alert>
				</Group>
			</Loading>

			<Loading state={isLoading ? "loading" : "normal"} {feedback} {size} {variant}>
				<Group direction="column">
					<Alert {showIcon} size={"lg"}> Lorem ipsum dolor, sit amet consectetur adipisicing elit. Et quo, eveniet corporis fugiat minus doloribus aperiam impedit magni dolor quidem iusto, cupiditate explicabo maxime aut sed consequatur dolorum quam esse! </Alert>
					<Alert variant="secondary"  size={"lg"} {showIcon}> Lorem ipsum dolor, sit amet consectetur adipisicing elit. Et quo, eveniet corporis fugiat minus doloribus aperiam impedit magni dolor quidem iusto, cupiditate explicabo maxime aut sed consequatur dolorum quam esse! </Alert>
					<Alert variant="secondary"  size={"lg"} {showIcon}> Lorem ipsum dolor, sit amet consectetur adipisicing elit. Et quo, eveniet corporis fugiat minus doloribus aperiam impedit magni dolor quidem iusto, cupiditate explicabo maxime aut sed consequatur dolorum quam esse! </Alert>
				</Group>
			</Loading>
			<Loading state={isLoading ? "loading" : "normal"} {feedback} {size} {variant}>
				<Group direction="column">
					<Alert {feedback} {showIcon}> Lorem ipsum dolor, sit amet consectetur adipisicing elit. Et quo, eveniet corporis fugiat minus doloribus aperiam impedit magni dolor quidem iusto, cupiditate explicabo maxime aut sed consequatur dolorum quam esse! </Alert>
				</Group>
			</Loading>
		</Flex>
	</Hst.Variant>

  
</Hst.Story>
