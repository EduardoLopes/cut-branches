import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resizeContainer } from '../resizeContainer';

describe('resizeContainer action', () => {
	let container: HTMLDivElement;
	let child1: HTMLDivElement;
	let child2: HTMLDivElement;
	let resizeAction: { destroy: () => void };

	beforeEach(() => {
		container = document.createElement('div');
		child1 = document.createElement('div');
		child2 = document.createElement('div');

		// Set up actual heights using inline styles
		child1.style.height = '100px';
		child2.style.height = '150px';

		container.appendChild(child1);
		container.appendChild(child2);
		document.body.appendChild(container);

		// Apply the action
		resizeAction = resizeContainer(container);
	});

	afterEach(() => {
		if (container.parentNode) {
			container.parentNode.removeChild(container);
		}
		if (resizeAction) {
			resizeAction.destroy();
		}
		vi.restoreAllMocks();
	});

	it('should set the container height based on children heights', () => {
		expect(container.style.height).toBe('250px'); // 100 + 150 = 250
	});

	it('should set overflow and transition styles', () => {
		expect(container.style.overflow).toBe('hidden');
		expect(container.style.transition).toBe('height 150ms ease-out');
	});

	it('should update height when children change', async () => {
		// Create a new child with different height
		const child3 = document.createElement('div');
		child3.style.height = '75px';

		// Append child - this will trigger the MutationObserver
		container.appendChild(child3);

		// Wait for MutationObserver to trigger
		await tick();

		// Check that the container's height was updated
		const expectedHeight = child1.offsetHeight + child2.offsetHeight + child3.offsetHeight;
		expect(container.style.height).toBe(`${expectedHeight}px`); // 100 + 150 + 75 = 325
	});

	it('should update height when mutation observer is triggered', async () => {
		// Get the initial height
		const initialHeight = container.style.height;

		// Add a new child element (this triggers childList mutation)
		const child3 = document.createElement('div');
		child3.style.height = '50px';
		container.appendChild(child3);

		// Wait for MutationObserver to trigger
		await tick();

		// The height should have changed from the initial value
		expect(container.style.height).not.toBe(initialHeight);

		// Check that it includes all three children's heights
		const expectedHeight = child1.offsetHeight + child2.offsetHeight + child3.offsetHeight;
		expect(container.style.height).toBe(`${expectedHeight}px`);
	});

	it('should cleanup on destroy', () => {
		// Simply verify that destroy can be called without errors
		expect(() => resizeAction.destroy()).not.toThrow();
	});
});
