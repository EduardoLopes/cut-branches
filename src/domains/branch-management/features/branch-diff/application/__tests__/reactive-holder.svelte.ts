/**
 * Test helper: a deeply reactive box for driving composable effects from
 * plain `.test.ts` files (which the Svelte compiler doesn't process, so they
 * can't declare `$state` themselves).
 */
export function reactiveHolder<T>(initial: T) {
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
