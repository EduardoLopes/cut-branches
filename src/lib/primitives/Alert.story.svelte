<script lang="ts">
	import type { Hst } from '@histoire/plugin-svelte';
	import Alert, { type AlertFeedback, type AlertSize } from './Alert.svelte';
	import Flex from './Flex/index.svelte';
	import Group from './Group.svelte';
	export let Hst: Hst;

	let feedback: AlertFeedback = 'normal';
	let feedbackOptions = [
		{ value: 'danger', label: 'danger' },
		{ value: 'info', label: 'info' },
		{ value: 'normal', label: 'normal' },
		{ value: 'success', label: 'success' },
		{ value: 'warning', label: 'warning' }
	];

	let size: AlertSize = 'md';
	let sizeOptions = [
		{ value: 'sm', label: 'sm' },
		{ value: 'md', label: 'md' },
		{ value: 'lg', label: 'lg' }
	];

  let showIcon: boolean = true;

</script>

<Hst.Story>
	<svelte:fragment slot="controls">
		<Hst.Radio bind:value={feedback} bind:options={feedbackOptions} title="Feedback" />
		<Hst.Radio bind:value={size} bind:options={sizeOptions} title="Size" />
    <Hst.Checkbox bind:value={showIcon} title="Show Icon" />

	</svelte:fragment>

	<Hst.Variant title="default variants">
    <Flex gap="1.6rem">
      <Alert {feedback} {size} {showIcon}> Lorem ipsum dolor, sit amet consectetur adipisicing elit. Et quo, eveniet corporis fugiat minus doloribus aperiam impedit magni dolor quidem iusto, cupiditate explicabo maxime aut sed consequatur dolorum quam esse! </Alert>
      <Alert variant="secondary" {feedback} {size} {showIcon}> Lorem ipsum dolor, sit amet consectetur adipisicing elit. Et quo, eveniet corporis fugiat minus doloribus aperiam impedit magni dolor quidem iusto, cupiditate explicabo maxime aut sed consequatur dolorum quam esse! </Alert>
    </Flex>
	</Hst.Variant>

  <Hst.Variant title="group">
    <Flex gap="1.6rem">
    
    <Group>
      <Alert {feedback} {size} {showIcon}> Lorem ipsum dolor, sit amet consectetur adipisicing elit. Et quo, eveniet corporis fugiat minus doloribus aperiam impedit magni dolor quidem iusto, cupiditate explicabo maxime aut sed consequatur dolorum quam esse! </Alert>
      <Alert variant="secondary" {feedback} {size} {showIcon}> Lorem ipsum dolor, sit amet consectetur adipisicing elit. Et quo, eveniet corporis fugiat minus doloribus aperiam impedit magni dolor quidem iusto, cupiditate explicabo maxime aut sed consequatur dolorum quam esse! </Alert>
      <Alert variant="secondary" {feedback} {size} {showIcon}> Lorem ipsum dolor, sit amet consectetur adipisicing elit. Et quo, eveniet corporis fugiat minus doloribus aperiam impedit magni dolor quidem iusto, cupiditate explicabo maxime aut sed consequatur dolorum quam esse! </Alert>
    </Group>

    <Group direction="column">
      <Alert {feedback} {size} {showIcon}> Lorem ipsum dolor, sit amet consectetur adipisicing elit. Et quo, eveniet corporis fugiat minus doloribus aperiam impedit magni dolor quidem iusto, cupiditate explicabo maxime aut sed consequatur dolorum quam esse! </Alert>
      <Alert variant="secondary" {feedback} {size} {showIcon}> Lorem ipsum dolor, sit amet consectetur adipisicing elit. Et quo, eveniet corporis fugiat minus doloribus aperiam impedit magni dolor quidem iusto, cupiditate explicabo maxime aut sed consequatur dolorum quam esse! </Alert>
      <Alert variant="secondary" {feedback} {size} {showIcon}> Lorem ipsum dolor, sit amet consectetur adipisicing elit. Et quo, eveniet corporis fugiat minus doloribus aperiam impedit magni dolor quidem iusto, cupiditate explicabo maxime aut sed consequatur dolorum quam esse! </Alert>
    </Group>

    <Group direction="column">
      <Alert {feedback} {size} {showIcon}> Lorem ipsum dolor, sit amet consectetur adipisicing elit. Et quo, eveniet corporis fugiat minus doloribus aperiam impedit magni dolor quidem iusto, cupiditate explicabo maxime aut sed consequatur dolorum quam esse! </Alert>
    </Group>
  </Flex>
	</Hst.Variant>

  
</Hst.Story>
