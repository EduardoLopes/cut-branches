<script lang="ts">
	import Icon from '@iconify/svelte';
	import Banner from '@pindoba/svelte-banner';
	import Button from '@pindoba/svelte-button';
	import Dialog from '@pindoba/svelte-dialog';
	import Stamp from '@pindoba/svelte-stamp';
	import { type Snippet } from 'svelte';
	import { createGetRepositoryListQuery } from '$infrastructure/queries/create-get-repository-list-query';
	import { portal } from '$utils/portal-action';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/**
		 * Primary call-to-action rendered inside the modal (the "Add a git
		 * repository" button). Injected by the composition root so this
		 * onboarding component never imports the repository-management domain.
		 */
		actionButton: Snippet<[]>;
	}

	const { actionButton }: Props = $props();

	const features = [
		{
			icon: 'mdi:check-circle-outline',
			eyebrow: 'Confidence',
			heading: 'Clean up merged branches safely'
		},
		{
			icon: 'mdi:backup-restore',
			eyebrow: 'Undo',
			heading: 'Restore anything you delete by mistake'
		},
		{
			icon: 'mdi:lightning-bolt-outline',
			eyebrow: 'Speed',
			heading: 'Delete in bulk in a single action'
		}
	];

	// The welcome experience is shown whenever the repository list is empty.
	const repositoriesQuery = createGetRepositoryListQuery();

	// Session-scoped dismissal: `Continue` (or closing the dialog) hides the
	// modal until the list becomes non-empty again. Resets on reload.
	let dismissed = $state(false);
	let open = $state(false);

	$effect(() => {
		if (repositoriesQuery.isPending || repositoriesQuery.isLoading) {
			return;
		}

		const isEmpty = (repositoriesQuery.data?.length ?? 0) === 0;

		if (isEmpty && !dismissed) {
			open = true;
		} else if (!isEmpty) {
			// Repositories exist: close and re-arm so the modal can show again
			// if the user later removes every repository.
			dismissed = false;
			open = false;
		}
	});

	function handleContinue() {
		dismissed = true;
		open = false;
	}

	function handleOpenChange(next: boolean) {
		open = next;

		// Any close initiated from within the dialog (close button, Escape,
		// backdrop) counts as a dismissal.
		if (!next) {
			dismissed = true;
		}
	}
</script>

<div use:portal>
	<Dialog
		{open}
		onChange={handleOpenChange}
		title={null}
		aria-label="Welcome to Cut Branches"
		data-testid="welcome-modal"
		passThrough={{
			root: {
				style: css.raw({
					width: '1000px',
					maxWidth: 'calc(100vw - token(spacing.2xl))'
				})
			},
			content: {
				style: css.raw({
					padding: '0',
					overflow: 'hidden',
					borderRadius: 'xl'
				})
			}
		}}
	>
		<div
			class={css({
				display: 'grid',
				gridTemplateColumns: '1fr',
				minHeight: '440px',
				md: {
					gridTemplateColumns: '1fr 1fr'
				}
			})}
		>
			<!-- Info panel -->
			<div
				class={css({
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					gap: 'xl',
					padding: '3xl',
					background: 'neutral.surface.peak'
				})}
			>
				<div
					class={css({
						display: 'flex',
						flexDirection: 'column',
						gap: 'lg'
					})}
				>
					<div
						class={css({
							display: 'flex',
							flexDirection: 'column',
							gap: 'sm'
						})}
					>
						<span
							class={css({
								fontSize: 'sm',
								fontWeight: 'semibold',
								letterSpacing: 'wider',
								textTransform: 'uppercase',
								color: 'primary.text'
							})}
						>
							Welcome to
						</span>
						<h2
							class={css({
								fontSize: '4xl',
								fontWeight: 'bold',
								lineHeight: '1.15',
								margin: '0',
								color: 'neutral.text.bold'
							})}
						>
							Cut Branches
						</h2>
					</div>

					<p
						class={css({
							fontSize: 'lg',
							lineHeight: '1.7',
							margin: '0',
							color: 'neutral.text.muted'
						})}
					>
						Manage and clean up your Git branches effortlessly. Add a repository to see its branches
						and start tidying up.
					</p>
				</div>

				<div
					class={css({
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'flex-end',
						gap: 'sm',
						paddingTop: 'sm'
					})}
				>
					<!-- Full-width flex row so the action control (whose own width can
					     vary) is reliably pushed to the right; a flex-column's
					     `alignItems` doesn't right-align a child that stretches. -->
					<div class={css({ display: 'flex', justifyContent: 'flex-end', width: '100%' })}>
						{@render actionButton()}
					</div>
					<Button
						emphasis="ghost"
						size="md"
						onclick={handleContinue}
						data-testid="welcome-continue"
					>
						Continue without adding
					</Button>
				</div>
			</div>

			<!-- Visual / accent panel -->
			<div
				class={css({
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'flex-end',
					gap: 'xl',
					padding: '3xl',
					position: 'relative',
					overflow: 'hidden',
					background: 'primary.surface.peak',
					color: 'primary.text.bold',
					'&::before': {
						content: '""',
						position: 'absolute',
						inset: 0,
						background:
							'radial-gradient(circle at 78% 18%, token(colors.primary.surface.valley) 0%, transparent 55%), radial-gradient(circle at 15% 92%, token(colors.primary.surface.base) 0%, transparent 55%)',
						opacity: 0.85,
						pointerEvents: 'none'
					}
				})}
			>
				<h3
					class={css({
						position: 'relative',
						fontSize: '2xl',
						fontWeight: 'bold',
						lineHeight: '1.25',
						margin: '0'
					})}
				>
					Tidy branches, zero guesswork
				</h3>

				<div
					class={css({
						position: 'relative',
						display: 'flex',
						flexDirection: 'column',
						gap: 'lg'
					})}
				>
					{#each features as feature (feature.heading)}
						<Banner
							eyebrow={feature.eyebrow}
							heading={feature.heading}
							feedback="primary"
							passThrough={{
								eyebrow: { style: css.raw({}) },
								heading: { style: css.raw({ fontWeight: '500' }) }
							}}
						>
							{#snippet leading()}
								<Stamp
									shape="circle"
									size="lg"
									border="none"
									emphasis="tertiary"
									feedback="primary"
								>
									<Icon icon={feature.icon} width="18px" height="18px" />
								</Stamp>
							{/snippet}
						</Banner>
					{/each}
				</div>
			</div>
		</div>
	</Dialog>
</div>
