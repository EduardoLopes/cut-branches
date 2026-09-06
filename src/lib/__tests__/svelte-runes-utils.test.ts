import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createToggle, debounce } from '../svelte-runes-utils';

describe('svelte-runes-utils', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('createToggle', () => {
		it('should initialize with default value false', () => {
			const toggle = createToggle();
			expect(toggle.get()).toBe(false);
		});

		it('should initialize with provided value', () => {
			const toggle = createToggle(true);
			expect(toggle.get()).toBe(true);
		});

		it('should set value correctly', () => {
			const toggle = createToggle(false);

			toggle.set(true);
			expect(toggle.get()).toBe(true);

			toggle.set(false);
			expect(toggle.get()).toBe(false);
		});

		it('should toggle value correctly', () => {
			const toggle = createToggle(false);

			toggle.toggle();
			expect(toggle.get()).toBe(true);

			toggle.toggle();
			expect(toggle.get()).toBe(false);
		});

		it('should reset to initial value', () => {
			const toggle = createToggle(true);

			toggle.set(false);
			expect(toggle.get()).toBe(false);

			toggle.reset();
			expect(toggle.get()).toBe(true);
		});

		it('should reset to initial value after multiple changes', () => {
			const toggle = createToggle(false);

			toggle.toggle(); // true
			toggle.toggle(); // false
			toggle.set(true); // true

			toggle.reset();
			expect(toggle.get()).toBe(false);
		});

		it('should handle multiple toggle instances independently', () => {
			const toggle1 = createToggle(true);
			const toggle2 = createToggle(false);

			toggle1.toggle();
			toggle2.toggle();

			expect(toggle1.get()).toBe(false);
			expect(toggle2.get()).toBe(true);
		});
	});

	describe('debounce', () => {
		it('should debounce function calls with default delay', async () => {
			const mockFn = vi.fn().mockResolvedValue('result');
			const debouncedFn = debounce(mockFn);

			// Call multiple times rapidly
			debouncedFn('arg1');
			debouncedFn('arg2');
			const promise3 = debouncedFn('arg3');

			// Advance timers to trigger debounced function
			await vi.advanceTimersByTimeAsync(300);

			// Only the last call should be executed
			expect(mockFn).toHaveBeenCalledTimes(1);
			expect(mockFn).toHaveBeenLastCalledWith('arg3');

			// The final promise should resolve with the result
			const result = await promise3;
			expect(result).toBe('result');
		});

		it('should debounce function calls with custom delay', async () => {
			const mockFn = vi.fn().mockResolvedValue('result');
			const debouncedFn = debounce(mockFn, 500);

			debouncedFn('arg1');
			debouncedFn('arg2');

			// Advance by less than delay - function should not be called yet
			await vi.advanceTimersByTimeAsync(400);
			expect(mockFn).not.toHaveBeenCalled();

			// Advance by remaining time
			await vi.advanceTimersByTimeAsync(100);
			expect(mockFn).toHaveBeenCalledTimes(1);
			expect(mockFn).toHaveBeenLastCalledWith('arg2');
		});

		it('should handle function that returns a value', async () => {
			const mockFn = vi.fn().mockResolvedValue(42);
			const debouncedFn = debounce(mockFn);

			const promise = debouncedFn('test');
			await vi.advanceTimersByTimeAsync(300);

			const result = await promise;
			expect(result).toBe(42);
		});

		it('should handle synchronous functions', async () => {
			const mockFn = vi.fn().mockReturnValue('sync-result');
			const debouncedFn = debounce(mockFn);

			const promise = debouncedFn('sync-arg');
			await vi.advanceTimersByTimeAsync(300);

			const result = await promise;
			expect(result).toBe('sync-result');
		});

		it('should handle function with multiple arguments', async () => {
			const mockFn = vi.fn().mockResolvedValue('multi-arg-result');
			const debouncedFn = debounce(mockFn);

			const promise = debouncedFn('arg1', 'arg2', 123, { key: 'value' });
			await vi.advanceTimersByTimeAsync(300);

			expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 123, { key: 'value' });

			const result = await promise;
			expect(result).toBe('multi-arg-result');
		});

		it('should reject when debounced function throws an error', async () => {
			const mockFn = vi.fn().mockRejectedValue(new Error('Test error'));
			const debouncedFn = debounce(mockFn);

			const promise = debouncedFn('error-test');
			// Add error handler to prevent unhandled rejection warnings
			promise.catch(() => {});
			await vi.advanceTimersByTimeAsync(300);

			await expect(promise).rejects.toThrow('Test error');
			expect(mockFn).toHaveBeenCalledWith('error-test');
		});

		it('should reject when synchronous function throws an error', async () => {
			const mockFn = vi.fn().mockImplementation(() => {
				throw new Error('Sync error');
			});
			const debouncedFn = debounce(mockFn);

			const promise = debouncedFn('sync-error-test');
			// Add error handler to prevent unhandled rejection warnings
			promise.catch(() => {});
			await vi.advanceTimersByTimeAsync(300);

			await expect(promise).rejects.toThrow('Sync error');
			expect(mockFn).toHaveBeenCalledWith('sync-error-test');
		});

		it('should clear previous timeout when called again', async () => {
			const mockFn = vi.fn().mockResolvedValue('result');
			const debouncedFn = debounce(mockFn, 300);

			// First call
			debouncedFn('first');

			// Advance time partially
			await vi.advanceTimersByTimeAsync(200);
			expect(mockFn).not.toHaveBeenCalled();

			// Second call should clear the first timeout
			debouncedFn('second');

			// Advance to where first call would have executed
			await vi.advanceTimersByTimeAsync(100);
			expect(mockFn).not.toHaveBeenCalled();

			// Advance to where second call should execute
			await vi.advanceTimersByTimeAsync(200);
			expect(mockFn).toHaveBeenCalledTimes(1);
			expect(mockFn).toHaveBeenCalledWith('second');
		});

		it('should handle zero delay', async () => {
			const mockFn = vi.fn().mockResolvedValue('immediate');
			const debouncedFn = debounce(mockFn, 0);

			const promise = debouncedFn('zero-delay');
			await vi.advanceTimersByTimeAsync(0);

			expect(mockFn).toHaveBeenCalledWith('zero-delay');
			const result = await promise;
			expect(result).toBe('immediate');
		});
	});
});
