// https://svelte.dev/repl/5b46f83924f5437dae097b612f3d97b0?version=3.38.2
export function resizeContainer(node: HTMLElement) {
	function updateHeight() {
		const childrenHeight = (Array.from(node.children) as HTMLElement[]).reduce(
			(acc, item) => acc + item.offsetHeight,
			0
		);
		node.style.setProperty('height', `${childrenHeight}px`);
	}

	const observer = new MutationObserver(() => {
		updateHeight();
	});
	observer.observe(node, { characterData: true, subtree: true, childList: true });

	updateHeight();

	node.style.setProperty('overflow', 'hidden');
	node.style.setProperty('transition', 'height 150ms ease');

	return {
		destroy() {
			observer?.disconnect();
		}
	};
}
