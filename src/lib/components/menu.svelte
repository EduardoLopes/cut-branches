<script lang="ts">
	import { repos } from '$lib/stores/branches';

	import Button from '@pindoba/svelte-button';
	import Loading from '@pindoba/svelte-loading';
	import Navigation from '@pindoba/svelte-navigation';
	import ThemeModeSelect from '@pindoba/svelte-theme-mode-select';
	import Icon from '@iconify/svelte';
	import { useCreateRepositoryID } from '$lib/services/useCreateRepositoryID';
	import { goto } from '$app/navigation';
	import { version } from '$app/environment';
	import { page } from '$app/stores';
	import { css } from '@pindoba/panda/css';
	import { spacer, visuallyHidden } from '@pindoba/panda/patterns';
	import { createNotifications } from '../stores/notifications';

	const notifications = createNotifications();

	const createRepositoryIDMutation = useCreateRepositoryID({
		onSuccess(data) {
			goto(`/repos/${data.id}`, {
				state: {
					path: data.path,
					name: data.name,
					id: data.id
				}
			});
		},
		meta: {
			showErrorNotification: true
		}
	});

	async function handleAddClick() {
		const { open } = await import('@tauri-apps/api/dialog');

		if (open) {
			open({ directory: true })
				.then(async (dir) => {
					if (dir && typeof dir === 'string') {
						createRepositoryIDMutation.mutate({
							path: dir
						});
					}
				})
				.catch((error) => {
					notifications.push({ feedback: 'danger', title: 'Error', message: error });
				});
		}
	}

	const items = $derived(
		$repos.map((repo) => ({
			id: repo.id,
			label: repo.name,
			href: `/repos/${repo.id}`,
			badge: repo.branchesCount ? `${repo.branchesCount}` : undefined
		}))
	);
</script>

<section
	class={css({
		display: 'grid',
		gridTemplateRows: 'min-content auto min-content',
		_dark: {
			background: 'primary.50',
			borderRight: '1px dashed token(colors.primary.300)'
		},
		_light: {
			borderRight: '1px dashed token(colors.primary.700)',
			background: 'primary.800'
		}
	})}
>
	<div
		class={css({
			display: 'flex',
			gap: 'md',
			padding: 'md',
			alignItems: 'center',
			_dark: {
				borderBottom: '1px dashed token(colors.primary.300)'
			},
			_light: {
				borderBottom: '1px dashed token(colors.primary.700)'
			},
			borderBottom: '1px dashed token(colors.primary.300)',
			height: 'calc((token(spacing.xl)) * 2.5)'
		})}
	>
		<Icon
			icon="game-icons:tree-branch"
			width="24px"
			height="24px"
			class={css({
				_dark: {
					color: 'primary.800'
				},
				_light: {
					color: 'primary.800.contrast'
				}
			})}
		/>
		<h1
			class={css({
				_dark: {
					color: 'primary.950'
				},
				_light: {
					color: 'primary.800.contrast'
				},
				fontSize: 'lg',
				margin: '0',
				fontWeight: 'bold'
			})}
		>
			Cut Branches
		</h1>
	</div>
	<div
		class={css({
			minWidth: '260px',
			px: 'token(spacing.sm)'
		})}
	>
		<div
			class={css({
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				py: 'token(spacing.sm)'
			})}
		>
			<h2
				class={css({
					fontSize: 'xs',
					textTransform: 'uppercase',
					opacity: 0.6,
					color: 'neutral.800.contrast',
					margin: '0'
				})}
			>
				Repositories
			</h2>
			<Loading isLoading={createRepositoryIDMutation.isPending}>
				<Button
					size="sm"
					onclick={handleAddClick}
					shape="square"
					passThrough={{
						root: css.raw({
							background: 'transparent',
							boxShadow: '0 0 0 1px token(colors.primary.600)'
						})
					}}
				>
					<Icon icon="material-symbols:add-rounded" width="24px" height="24px" />
					<span class={visuallyHidden()}>Add repository</span>
				</Button>
			</Loading>
		</div>
		{#if $repos}
			<Navigation
				{items}
				activeItem={$page.params.id}
				direction="vertical"
				passThrough={{
					root: css.raw({
						bg: 'transparent',
						padding: '0'
					}),
					item: css.raw({
						color: 'neutral.800.contrast',
						_hover: {
							color: 'primary.950'
						}
					}),
					itemActive: css.raw({
						color: 'primary.950.contrast'
					})
				}}
			/>
		{/if}
	</div>

	<div
		class={css({
			_dark: {
				borderTop: '1px dashed token(colors.primary.300)',
				background: 'primary.200'
			},
			_light: {
				borderTop: '1px dashed token(colors.primary.700)',
				background: 'primary.950'
			},
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center',
			height: 'calc((token(spacing.sm)) * 2.5)',
			p: 'token(spacing.xxs)'
		})}
	>
		<div
			class={css({
				fontSize: 'sm',
				_dark: {
					color: 'primary.900'
				},
				_light: {
					color: 'primary.600'
				},
				display: 'flex'
			})}
		>
			v{version}
		</div>
		<div class={spacer()}></div>
		<ThemeModeSelect
			popoverProps={{ placement: 'top' }}
			buttonProps={{
				size: 'xs',
				passThrough: {
					root: css.raw({
						padding: 0,
						_dark: {
							color: 'primary.900'
						},
						_light: {
							color: 'primary.600'
						}
					})
				}
			}}
		/>
	</div>
</section>
