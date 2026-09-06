import type { Action } from 'svelte/action';

/**
 * Reflects a scroll container's clipped-content state as `data-overflow-top` /
 * `data-overflow-bottom` attributes on the node. A sibling overlay keys its
 * scroll-hint box-shadow off these attributes, so a shadow only appears when
 * there is actually more content to scroll to in that direction.
 *
 * The state is recomputed on three triggers so it never goes stale:
 * - `scroll` — the user moved within the list.
 * - `ResizeObserver` — the viewport (panel) height changed.
 * - `MutationObserver` — the content changed height, e.g. the async repository
 *   list arriving or the collapse rail swapping item layout. Inline `style`
 *   changes count too: a virtualizer grows its spacer by rewriting
 *   `style.height`, which is neither a childList mutation nor a resize of the
 *   scroll box itself.
 */
export const scrollShadow: Action<HTMLElement> = (node) => {
	function update() {
		const { scrollTop, scrollHeight, clientHeight } = node;
		const maxScroll = scrollHeight - clientHeight;
		// A 1px slack absorbs sub-pixel rounding so the hint doesn't flicker
		// against the very top/bottom of the range.
		node.toggleAttribute('data-overflow-top', scrollTop > 1);
		node.toggleAttribute('data-overflow-bottom', scrollTop < maxScroll - 1);
	}

	node.addEventListener('scroll', update, { passive: true });
	const resizeObserver = new ResizeObserver(update);
	resizeObserver.observe(node);
	const mutationObserver = new MutationObserver(update);
	mutationObserver.observe(node, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['style']
	});
	update();

	return {
		destroy() {
			node.removeEventListener('scroll', update);
			resizeObserver.disconnect();
			mutationObserver.disconnect();
		}
	};
};
