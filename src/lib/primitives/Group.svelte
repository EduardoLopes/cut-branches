<script context="module" lang="ts">
	export type GroupDirection = 'row' | 'column';

	export interface GroupProps {
		direction?: GroupDirection;
		class?: string;
	}
</script>

<script lang="ts">
	type $$Props = GroupProps;

	export let direction: $$Props['direction'] = 'row';
</script>

<div class="group direction-{direction} {$$props.class || ''}">
	<slot />
</div>

<style lang="scss">
	.group {
		display: flex;

		&.direction-row {
			flex-direction: row;
		}
		&.direction-column {
			flex-direction: column;
		}

		&.direction-row {
			> :where(div, button, input, textarea, select, label, a, span) {
				&:not(:first-child):not(:last-child):not(:only-child) {
					border-right-width: 0;
					border-top-right-radius: 0;
					border-bottom-right-radius: 0;
					border-top-left-radius: 0;
					border-bottom-left-radius: 0;
				}

				&:first-child:not(:only-child) {
					border-right-width: 0;
					border-top-right-radius: 0 !important;
					border-bottom-right-radius: 0 !important;
				}

				&:last-child:not(:only-child) {
					border-top-left-radius: 0 !important;
					border-bottom-left-radius: 0 !important;
				}
			}
		}
		&.direction-column {
			> :where(div, button, input, textarea, select, label, a, span) {
				&:not(:first-child):not(:last-child):not(:only-child) {
					border-bottom-width: 0;
					border-top-right-radius: 0;
					border-bottom-right-radius: 0;
					border-top-left-radius: 0;
					border-bottom-left-radius: 0;
				}

				&:first-child:not(:only-child) {
					border-bottom-left-radius: 0;
					border-bottom-right-radius: 0;
					border-bottom-width: 0;
				}

				&:last-child:not(:only-child) {
					border-top-left-radius: 0;
					border-top-right-radius: 0;
				}
			}
		}
	}
</style>
