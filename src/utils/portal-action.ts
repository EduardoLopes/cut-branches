import type { Action } from 'svelte/action';

/**
 * Portal action parameters
 */
export interface PortalActionParams {
	/**
	 * The parent element to append the node to
	 * @default document.body
	 */
	parent?: HTMLElement | null;
	/**
	 * Whether the portal is enabled
	 * @default true
	 */
	enabled?: boolean;
}

/**
 * Svelte action that moves an element to a different location in the DOM (portal/teleport).
 * Useful for modals, dialogs, tooltips, and other overlay components that need to break out
 * of their parent's stacking context.
 *
 * @example
 * ```svelte
 * <div use:portal>
 *   <Modal />
 * </div>
 *
 * <div use:portal={{ parent: customContainer }}>
 *   <Tooltip />
 * </div>
 *
 * <div use:portal={{ enabled: isOpen }}>
 *   <Popover />
 * </div>
 * ```
 *
 * @param node - The DOM element to portal
 * @param params - Configuration options
 * @returns Action object with update and destroy methods
 */
export const portal: Action<HTMLElement, PortalActionParams | undefined> = (node, params = {}) => {
	const { parent = document.body, enabled = true } = params;

	let previousParent: Node | null = null;
	let nextSibling: Node | null = null;

	/**
	 * Moves the node to the portal parent
	 */
	function moveToPortal() {
		if (!enabled || !parent) {
			return;
		}

		// Store the original position for restoration
		previousParent = node.parentNode;
		nextSibling = node.nextSibling;

		// Move node to portal parent
		try {
			parent.appendChild(node);
		} catch (error) {
			console.error('[portal-action] Failed to append node to portal parent:', error);
		}
	}

	/**
	 * Restores the node to its original position
	 */
	function restorePosition() {
		if (!previousParent) {
			return;
		}

		try {
			if (nextSibling && nextSibling.parentNode === previousParent) {
				previousParent.insertBefore(node, nextSibling);
			} else {
				previousParent.appendChild(node);
			}
		} catch (error) {
			console.error('[portal-action] Failed to restore node position:', error);
		}

		previousParent = null;
		nextSibling = null;
	}

	// Initial move
	moveToPortal();

	return {
		update(newParams: PortalActionParams = {}) {
			const { parent: newParent = document.body, enabled: newEnabled = true } = newParams;

			// If disabled, restore position
			if (!newEnabled && enabled) {
				restorePosition();
				return;
			}

			// If enabled and parent changed, move to new parent
			if (newEnabled && (parent !== newParent || !enabled)) {
				restorePosition();
				const updatedParams = { parent: newParent, enabled: newEnabled };
				const { parent: finalParent = document.body } = updatedParams;

				if (finalParent) {
					previousParent = node.parentNode;
					nextSibling = node.nextSibling;

					try {
						finalParent.appendChild(node);
					} catch (error) {
						console.error('[portal-action] Failed to append node to new parent:', error);
					}
				}
			}
		},

		destroy() {
			// Restore node to original position on cleanup
			restorePosition();
		}
	};
};
