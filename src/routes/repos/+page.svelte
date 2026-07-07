<script lang="ts">
	import Icon from '@iconify/svelte';
	import Stamp from '@pindoba/svelte-stamp';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AddRepositoryMenu from '$domains/repository-management/components/add-repository-menu.svelte';
	import { css } from '@pindoba/styled-system/css';
</script>

<div
	class={css({
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 'xl',
		height: 'full',
		width: 'full',
		padding: '2xl',
		textAlign: 'center',
		background: 'neutral.surface.step.1'
	})}
	data-testid="repos-empty-state"
>
	<Stamp shape="circle" size="xl" emphasis="secondary" feedback="primary">
		<Icon icon="mdi:source-branch-plus" width="32px" height="32px" />
	</Stamp>

	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			gap: 'xs',
			maxWidth: '420px'
		})}
	>
		<h2
			class={css({
				fontSize: '2xl',
				fontWeight: 'bold',
				margin: '0',
				color: 'neutral.text.bold'
			})}
		>
			No repositories yet
		</h2>
		<p
			class={css({
				fontSize: 'md',
				lineHeight: '1.6',
				margin: '0',
				color: 'neutral.text.muted'
			})}
		>
			Add a Git repository to see its branches and start tidying up.
		</p>
	</div>

	<AddRepositoryMenu
		size="sm"
		emphasis="primary"
		onSuccess={(data) => goto(resolve(`/repos/${data.id}`))}
	/>
</div>
