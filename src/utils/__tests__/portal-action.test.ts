import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { portal } from '../portal-action';

describe('portal', () => {
	let element: HTMLElement;
	let originalParent: HTMLElement;
	let customParent: HTMLElement;

	beforeEach(() => {
		// Create test elements
		element = document.createElement('div');
		element.textContent = 'Portal content';

		originalParent = document.createElement('div');
		originalParent.appendChild(element);

		customParent = document.createElement('div');
		customParent.id = 'custom-portal';

		document.body.appendChild(originalParent);
		document.body.appendChild(customParent);
	});

	afterEach(() => {
		// Cleanup
		document.body.innerHTML = '';
	});

	describe('initialization', () => {
		it('should move element to document.body by default', () => {
			const action = portal(element);

			expect(element.parentElement).toBe(document.body);
			expect(originalParent.contains(element)).toBe(false);

			action?.destroy?.();
		});

		it('should move element to custom parent when provided', () => {
			const action = portal(element, { parent: customParent });

			expect(element.parentElement).toBe(customParent);
			expect(originalParent.contains(element)).toBe(false);

			action?.destroy?.();
		});

		it('should not move element when enabled is false', () => {
			const action = portal(element, { enabled: false });

			expect(element.parentElement).toBe(originalParent);

			action?.destroy?.();
		});

		it('should not move element when parent is null', () => {
			const action = portal(element, { parent: null });

			expect(element.parentElement).toBe(originalParent);

			action?.destroy?.();
		});

		it('should handle empty params object', () => {
			const action = portal(element, {});

			expect(element.parentElement).toBe(document.body);

			action?.destroy?.();
		});

		it('should handle undefined params', () => {
			const action = portal(element, undefined);

			expect(element.parentElement).toBe(document.body);

			action?.destroy?.();
		});
	});

	describe('update', () => {
		it('should move element to new parent when parent changes', () => {
			const action = portal(element, { parent: document.body });

			expect(element.parentElement).toBe(document.body);

			action?.update?.({ parent: customParent });

			expect(element.parentElement).toBe(customParent);

			action?.destroy?.();
		});

		it('should restore position when disabled', () => {
			const action = portal(element, { enabled: true });

			expect(element.parentElement).toBe(document.body);

			action?.update?.({ enabled: false });

			expect(element.parentElement).toBe(originalParent);

			action?.destroy?.();
		});

		it('should move to portal when re-enabled', () => {
			const action = portal(element, { enabled: false });

			expect(element.parentElement).toBe(originalParent);

			action?.update?.({ enabled: true });

			expect(element.parentElement).toBe(document.body);

			action?.destroy?.();
		});

		it('should handle switching between different parents', () => {
			const secondCustomParent = document.createElement('div');
			document.body.appendChild(secondCustomParent);

			const action = portal(element, { parent: customParent });

			expect(element.parentElement).toBe(customParent);

			action?.update?.({ parent: secondCustomParent });

			expect(element.parentElement).toBe(secondCustomParent);

			action?.destroy?.();
		});

		it('should handle update with empty params', () => {
			const action = portal(element, { parent: customParent });

			expect(element.parentElement).toBe(customParent);

			action?.update?.({});

			// Should move to default parent (document.body)
			expect(element.parentElement).toBe(document.body);

			action?.destroy?.();
		});

		it('should handle update with undefined params', () => {
			const action = portal(element, { parent: customParent });

			expect(element.parentElement).toBe(customParent);

			action?.update?.(undefined);

			// Should move to default parent (document.body)
			expect(element.parentElement).toBe(document.body);

			action?.destroy?.();
		});

		it('should not move when enabled changes from true to true', () => {
			const action = portal(element, { enabled: true });

			expect(element.parentElement).toBe(document.body);

			const initialParent = element.parentElement;
			action?.update?.({ enabled: true });

			expect(element.parentElement).toBe(initialParent);

			action?.destroy?.();
		});

		it('should handle disabled to disabled transition', () => {
			const action = portal(element, { enabled: false });

			expect(element.parentElement).toBe(originalParent);

			action?.update?.({ enabled: false });

			expect(element.parentElement).toBe(originalParent);

			action?.destroy?.();
		});
	});

	describe('destroy', () => {
		it('should restore element to original position on destroy', () => {
			const action = portal(element, { parent: customParent });

			expect(element.parentElement).toBe(customParent);

			action?.destroy?.();

			expect(element.parentElement).toBe(originalParent);
		});

		it('should restore element to correct position with siblings', () => {
			const sibling1 = document.createElement('div');
			sibling1.textContent = 'Sibling 1';
			const sibling2 = document.createElement('div');
			sibling2.textContent = 'Sibling 2';

			originalParent.innerHTML = '';
			originalParent.appendChild(sibling1);
			originalParent.appendChild(element);
			originalParent.appendChild(sibling2);

			const action = portal(element, { parent: customParent });

			expect(element.parentElement).toBe(customParent);

			action?.destroy?.();

			expect(element.parentElement).toBe(originalParent);
			expect(element.previousElementSibling).toBe(sibling1);
			expect(element.nextElementSibling).toBe(sibling2);
		});

		it('should handle destroy when element was never moved', () => {
			const action = portal(element, { enabled: false });

			expect(() => action?.destroy?.()).not.toThrow();
			expect(element.parentElement).toBe(originalParent);
		});

		it('should handle destroy multiple times', () => {
			const action = portal(element);

			action?.destroy?.();
			expect(() => action?.destroy?.()).not.toThrow();
		});
	});

	describe('error handling', () => {
		it('should handle appendChild errors gracefully', () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const mockParent = {
				appendChild: vi.fn(() => {
					throw new Error('appendChild failed');
				})
			} as unknown as HTMLElement;

			const action = portal(element, { parent: mockParent });

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'[portal-action] Failed to append node to portal parent:',
				expect.any(Error)
			);

			consoleErrorSpy.mockRestore();
			action?.destroy?.();
		});

		it('should handle insertBefore errors gracefully', () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Create a scenario where insertBefore will be called
			const sibling = document.createElement('div');
			originalParent.innerHTML = '';
			originalParent.appendChild(element);
			originalParent.appendChild(sibling);

			const action = portal(element, { parent: customParent });

			// Mock insertBefore to throw an error
			const originalInsertBefore = originalParent.insertBefore.bind(originalParent);
			originalParent.insertBefore = vi.fn(() => {
				throw new Error('insertBefore failed');
			});

			action?.destroy?.();

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'[portal-action] Failed to restore node position:',
				expect.any(Error)
			);

			// Restore
			originalParent.insertBefore = originalInsertBefore;
			consoleErrorSpy.mockRestore();
		});

		it('should handle update appendChild errors gracefully', () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const action = portal(element, { parent: customParent });

			const mockParent = {
				appendChild: vi.fn(() => {
					throw new Error('appendChild failed');
				})
			} as unknown as HTMLElement;

			action?.update?.({ parent: mockParent });

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'[portal-action] Failed to append node to new parent:',
				expect.any(Error)
			);

			consoleErrorSpy.mockRestore();
			action?.destroy?.();
		});
	});

	describe('edge cases', () => {
		it('should handle when nextSibling is removed from DOM before restore', () => {
			const sibling = document.createElement('div');
			originalParent.innerHTML = '';
			originalParent.appendChild(element);
			originalParent.appendChild(sibling);

			const action = portal(element, { parent: customParent });

			// Remove the sibling
			sibling.remove();

			action?.destroy?.();

			expect(element.parentElement).toBe(originalParent);
		});

		it('should handle when nextSibling parent changes before restore', () => {
			const sibling = document.createElement('div');
			const newParent = document.createElement('div');

			originalParent.innerHTML = '';
			originalParent.appendChild(element);
			originalParent.appendChild(sibling);

			const action = portal(element, { parent: customParent });

			// Move sibling to different parent
			newParent.appendChild(sibling);

			action?.destroy?.();

			expect(element.parentElement).toBe(originalParent);
		});
	});
});
