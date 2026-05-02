/**
 * Wraps a function in `$effect.root` so composables that use `$effect` can be
 * exercised from `.test.ts` files (which are not processed by the Svelte
 * compiler and therefore can't reference runes directly).
 *
 * Returns the function's value and a cleanup that should be called at the end
 * of the test.
 */
export function withEffectRoot<T>(fn: () => T): { value: T; cleanup: () => void } {
	let value: T;
	const cleanup = $effect.root(() => {
		value = fn();
	});
	return {
		get value() {
			return value;
		},
		cleanup
	};
}
