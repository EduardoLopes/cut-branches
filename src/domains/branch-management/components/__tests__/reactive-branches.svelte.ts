import type { Branch } from '$domains/branch-management/core/models/branch';

/**
 * Test helper: a reactive box of branches for driving the component's
 * `$derived` chain from plain `.test.ts` files (which the Svelte compiler
 * doesn't process, so they can't declare `$state` themselves). A singleton so
 * hoisted `vi.mock` factories and test bodies share the same instance.
 */
function reactiveHolder<T>(initial: T) {
	let value = $state(initial);
	return {
		get value() {
			return value;
		},
		set value(next: T) {
			value = next;
		}
	};
}

export const branchesHolder = reactiveHolder<Branch[]>([]);
