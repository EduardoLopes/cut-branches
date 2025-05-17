import { cleanup } from '@testing-library/svelte';
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

		// Set up some measurable heights for the test
		Object.defineProperty(child1, 'offsetHeight', { value: 100, configurable: true });
		Object.defineProperty(child2, 'offsetHeight', { value: 150, configurable: true });

		container.appendChild(child1);
		container.appendChild(child2);
		document.body.appendChild(container);

		// Mock window resize event
		window.addEventListener = vi.fn();
		window.removeEventListener = vi.fn();

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
		cleanup();
		vi.restoreAllMocks();
	});

	it('should set the container height based on children heights', () => {
		expect(container.style.height).toBe('250px'); // 100 + 150 = 250
	});

	it('should set overflow and transition styles', () => {
		expect(container.style.overflow).toBe('hidden');
		expect(container.style.transition).toBe('height 150ms ease-out');
	});

	it('should add window resize event listener', () => {
		expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
	});

	it('should update height when children change', () => {
		// Create a new child with different height
		const child3 = document.createElement('div');
		Object.defineProperty(child3, 'offsetHeight', { value: 75, configurable: true });

		// Simulate MutationObserver callback
		container.appendChild(child3);

		// Get the MutationObserver callback from the mocked call
		const mockObserver = vi.spyOn(MutationObserver.prototype, 'observe');

		// Re-apply the action to trigger the creation of a new MutationObserver
		if (resizeAction) {
			resizeAction.destroy();
		}
		resizeAction = resizeContainer(container);

		// Verify the observer was created with correct parameters
		expect(mockObserver).toHaveBeenCalledWith(container, {
			characterData: true,
			subtree: true,
			childList: true
		});

		// Since we can't easily trigger the MutationObserver callback in tests,
		// we'll manually check that the container's height would be updated
		const expectedHeight = child1.offsetHeight + child2.offsetHeight + child3.offsetHeight;
		expect(container.style.height).toBe(`${expectedHeight}px`); // 100 + 150 + 75 = 325
	});

	it('should update height when mutation observer is triggered', () => {
		let capturedCallback: MutationCallback | undefined;
		const mockObserve = vi.fn();
		const mockDisconnect = vi.fn();

		const mockMutationObserver = vi
			.spyOn(globalThis, 'MutationObserver')
			.mockImplementation((callback: MutationCallback) => {
				capturedCallback = callback;
				return {
					observe: mockObserve,
					disconnect: mockDisconnect,
					takeRecords: vi.fn(),
					unobserve: vi.fn()
				};
			});

		resizeAction.destroy(); // Destroy previous action that used the original observer
		resizeAction = resizeContainer(container); // Action now uses mocked observer

		// Update a child's height, which should eventually trigger the observer
		Object.defineProperty(child1, 'offsetHeight', { value: 50, configurable: true });

		// Manually trigger the captured callback
		if (capturedCallback) {
			capturedCallback([], mockMutationObserver.mock.instances[0] as unknown as MutationObserver);
		} else {
			throw new Error('MutationObserver callback was not captured');
		}

		// Check if the height was updated
		const newExpectedHeight = child1.offsetHeight + child2.offsetHeight;
		expect(container.style.height).toBe(`${newExpectedHeight}px`); // 50 + 150 = 200
	});

	it('should disconnect observer on destroy', () => {
		const disconnectSpy = vi.spyOn(MutationObserver.prototype, 'disconnect');

		// Call the destroy method
		resizeAction.destroy();

		expect(disconnectSpy).toHaveBeenCalled();
	});
});
