<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Loading from '@pindoba/svelte-loading';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { open } from '@tauri-apps/plugin-dialog';
	import { notifications } from '$domains/notifications/store/notifications.svelte';
	import { createCreateRepositoryMutation } from '$domains/repository-management/logic/application/mutations/create-create-repository-mutation';
	import { css } from '@pindoba/panda/css';

	const queryClient = useQueryClient();

	// Mutation to create repository
	const createRepositoryMutation = createCreateRepositoryMutation({
		onSuccess: (data) => {
			// Invalidate repositories query to refetch the list
			queryClient.invalidateQueries({ queryKey: ['listRepositories'] });

			if (data) {
				notifications.push({
					feedback: 'success',
					title: 'Repository added',
					message: `The repository ${data.name} was added successfully`
				});
			}
		},
		meta: {
			showErrorNotification: true
		}
	});

	function handleAddClick() {
		open({ directory: true, multiple: false })
			.then((dir) => {
				if (dir !== null) {
					createRepositoryMutation.mutate({ path: dir });
				}
			})
			.catch((error) => {
				notifications.push({
					title: 'Error',
					message: error.message || String(error),
					feedback: 'danger'
				});
			});
	}
</script>

<div
	class={css({
		display: 'flex',
		flexDirection: 'column',
		gap: 'xxxl',
		alignItems: 'center',
		width: 'full'
	})}
>
	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			gap: 'sm',
			alignItems: 'center',
			width: 'full'
		})}
	>
		<p
			class={css({
				fontSize: 'lg',
				color: 'neutral.950.contrast',
				margin: '0',
				textAlign: 'center',
				fontWeight: 'medium',
				lineHeight: '1.6',
				animation: 'fadeInUp 0.6s ease-out 0.6s both',
				_motionReduce: {
					animation: 'none'
				}
			})}
		>
			Get started by adding your first Git repository
		</p>
	</div>

	<div
		class={css({
			animation: 'fadeInUp 0.6s ease-out 0.8s both',
			_motionReduce: {
				animation: 'none'
			}
		})}
	>
		<Loading isLoading={createRepositoryMutation.isPending}>
			<Button onclick={handleAddClick} size="lg" emphasis="primary">
				<div
					class={css({
						display: 'flex',
						alignItems: 'center',
						gap: 'sm'
					})}
				>
					<Icon
						icon="material-symbols:add-circle-outline-rounded"
						width="24px"
						height="24px"
						data-testid="onboarding-cta-icon"
					/>
					<span>Add Repository</span>
				</div>
			</Button>
		</Loading>
	</div>

	<!-- Feature highlights -->
	<div
		class={css({
			display: 'grid',
			gridTemplateColumns: 'repeat(3, 1fr)',
			gap: 'lg',
			width: 'full',
			opacity: 0.9,
			animation: 'fadeInUp 0.6s ease-out 1s both',
			color: 'neutral.950',
			_motionReduce: {
				animation: 'none'
			}
		})}
	>
		<div
			class={css({
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 'xs',
				textAlign: 'center',
				padding: 'md'
			})}
		>
			<div
				class={css({
					width: '48px',
					height: '48px',
					borderRadius: 'full',
					background: 'primary.50',
					color: 'primary.900',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center'
				})}
			>
				<Icon icon="mdi:check-circle" width="24px" height="24px" />
			</div>
			<p
				class={css({
					fontSize: 'sm',
					margin: '0',
					fontWeight: 'medium'
				})}
			>
				Clean with confidence
			</p>
		</div>

		<div
			class={css({
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 'xs',
				textAlign: 'center',
				padding: 'md'
			})}
		>
			<div
				class={css({
					width: '48px',
					height: '48px',
					borderRadius: 'full',
					background: 'primary.50',
					color: 'primary.900',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center'
				})}
			>
				<Icon icon="mdi:history" width="24px" height="24px" />
			</div>
			<p
				class={css({
					fontSize: 'sm',
					margin: '0',
					fontWeight: 'medium'
				})}
			>
				Track & restore
			</p>
		</div>

		<div
			class={css({
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 'xs',
				textAlign: 'center',
				padding: 'md'
			})}
		>
			<div
				class={css({
					width: '48px',
					height: '48px',
					borderRadius: 'full',
					background: 'primary.50',
					color: 'primary.900',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center'
				})}
			>
				<Icon icon="mdi:lightning-bolt" width="24px" height="24px" />
			</div>
			<p
				class={css({
					fontSize: 'sm',
					margin: '0',
					fontWeight: 'medium'
				})}
			>
				Bulk operations
			</p>
		</div>
	</div>
</div>
