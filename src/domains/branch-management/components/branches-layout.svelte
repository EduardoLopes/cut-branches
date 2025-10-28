<script lang="ts">
	import { css, cva } from '@pindoba/styled-system/css';
	import Loading from '@pindoba/svelte-loading';
	import type { Snippet } from 'svelte';

	interface Props {
		isLoading: boolean;
		variant?: 'default' | 'inverted';
		children: Snippet;
	}

	const { isLoading, variant = 'default', children }: Props = $props();

	const contentStyles = cva({
		base: {
			display: 'flex',
			flexGrow: '1',
			flexDirection: 'column',
			width: '100%',
			height: 'auto',
			overflowY: 'auto',
			overflowX: 'hidden',
			borderRadius: 'md',
			border: '1px solid'
		},
		variants: {
			variant: {
				default: {
					borderColor: 'transparent',
					_light: {
						background: 'neutral.200'
					},
					_dark: {
						background: 'neutral.50'
					}
				},
				inverted: {
					borderColor: 'danger.600',
					_light: {
						background: 'danger.200'
					},
					_dark: {
						background: 'danger.50'
					}
				}
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	});
</script>

<Loading
	{isLoading}
	fillParent
	passThrough={{
		root: {
			style: css.raw({
				borderRadius: '0',
				flexGrow: '1',
				height: 'calc(100% - 60px)',
				_dark: {
					background: 'neutral.100'
				},
				_light: {
					background: 'neutral.50'
				},
				px: 'md',
				pb: 'md'
			})
		},
		overlay: {
			style: css.raw({
				borderRadius: '0',
				border: 'none'
			})
		},
		content: {
			style: contentStyles.raw({ variant })
		}
	}}
>
	{@render children()}
</Loading>
