/**
 * Drops Pindoba's Loading "leaf" skeleton rules (PIN-128).
 *
 * Four rules (`animation: none`, `background: none`, `color: transparent`,
 * `visibility: hidden`) find skeleton leaves with
 * `[data-loading-active] :is(:is(p, h1, …):not(:has(…)), :not(:has(*))) … *`.
 * Their subject is `*`, so WebKit runs those `:has()` subtree checks on every
 * element's ancestors on each DOM mutation — the `[data-loading-active]` gate
 * at the far left doesn't filter anything first. In the real WKWebView that
 * made style recalc ~9x slower (558ms → 61ms without them) and is what made
 * scrolling the branch list into new rows lag.
 *
 * Trade-off: inside a loading skeleton, text leaves stay visible instead of
 * turning invisible; the skeleton shapes themselves still render. Remove this
 * plugin once Pindoba replaces the CSS leaf detection (PIN-128).
 */
const LEAF_SKELETON_SELECTOR = '[data-loading-active] :is(:is(p, h1,';

const dropPindobaLeafSkeletonRules = () => ({
	postcssPlugin: 'drop-pindoba-leaf-skeleton-rules',
	OnceExit(root) {
		root.walkRules((rule) => {
			if (rule.selector.includes(LEAF_SKELETON_SELECTOR)) rule.remove();
		});
	}
});
dropPindobaLeafSkeletonRules.postcss = true;

module.exports = {
	// Order matters: Panda generates the stylesheet first, then the filter runs
	// over its output. A plugin object needs the array form, so Panda's plugin
	// is required here instead of named by string; postcss loads `.cjs`
	// configs through require() anyway.
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	plugins: [require('@pandacss/dev/postcss')(), dropPindobaLeafSkeletonRules()]
};
