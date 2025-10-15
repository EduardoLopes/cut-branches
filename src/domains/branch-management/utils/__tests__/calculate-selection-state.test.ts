import { describe, test, expect } from 'vitest';
import { calculateSelectionState } from '../calculate-selection-state';

describe('calculateSelectionState', () => {
	describe('isAllSelected', () => {
		test('returns true when all branches are selected', () => {
			const result = calculateSelectionState({
				selectedCount: 5,
				selectibleCount: 5
			});

			expect(result.isAllSelected).toBe(true);
			expect(result.isIndeterminate).toBe(false);
		});

		test('returns false when no branches are selected', () => {
			const result = calculateSelectionState({
				selectedCount: 0,
				selectibleCount: 5
			});

			expect(result.isAllSelected).toBe(false);
			expect(result.isIndeterminate).toBe(false);
		});

		test('returns false when some branches are selected', () => {
			const result = calculateSelectionState({
				selectedCount: 3,
				selectibleCount: 5
			});

			expect(result.isAllSelected).toBe(false);
		});

		test('returns false when selectibleCount is 0', () => {
			const result = calculateSelectionState({
				selectedCount: 0,
				selectibleCount: 0
			});

			expect(result.isAllSelected).toBe(false);
		});
	});

	describe('isIndeterminate', () => {
		test('returns true when some but not all branches are selected', () => {
			const result = calculateSelectionState({
				selectedCount: 3,
				selectibleCount: 5
			});

			expect(result.isIndeterminate).toBe(true);
			expect(result.isAllSelected).toBe(false);
		});

		test('returns false when no branches are selected', () => {
			const result = calculateSelectionState({
				selectedCount: 0,
				selectibleCount: 5
			});

			expect(result.isIndeterminate).toBe(false);
		});

		test('returns false when all branches are selected', () => {
			const result = calculateSelectionState({
				selectedCount: 5,
				selectibleCount: 5
			});

			expect(result.isIndeterminate).toBe(false);
		});

		test('returns true when 1 out of many is selected', () => {
			const result = calculateSelectionState({
				selectedCount: 1,
				selectibleCount: 10
			});

			expect(result.isIndeterminate).toBe(true);
		});
	});

	describe('edge cases', () => {
		test('handles single selectable branch - selected', () => {
			const result = calculateSelectionState({
				selectedCount: 1,
				selectibleCount: 1
			});

			expect(result.isAllSelected).toBe(true);
			expect(result.isIndeterminate).toBe(false);
		});

		test('handles single selectable branch - not selected', () => {
			const result = calculateSelectionState({
				selectedCount: 0,
				selectibleCount: 1
			});

			expect(result.isAllSelected).toBe(false);
			expect(result.isIndeterminate).toBe(false);
		});

		test('handles 0 selectable branches', () => {
			const result = calculateSelectionState({
				selectedCount: 0,
				selectibleCount: 0
			});

			expect(result.isAllSelected).toBe(false);
			expect(result.isIndeterminate).toBe(false);
		});

		test('handles large numbers', () => {
			const result = calculateSelectionState({
				selectedCount: 500,
				selectibleCount: 1000
			});

			expect(result.isIndeterminate).toBe(true);
			expect(result.isAllSelected).toBe(false);
		});
	});

	describe('boundary conditions', () => {
		test('almost all selected (n-1)', () => {
			const result = calculateSelectionState({
				selectedCount: 9,
				selectibleCount: 10
			});

			expect(result.isIndeterminate).toBe(true);
			expect(result.isAllSelected).toBe(false);
		});

		test('just one selected out of many', () => {
			const result = calculateSelectionState({
				selectedCount: 1,
				selectibleCount: 100
			});

			expect(result.isIndeterminate).toBe(true);
			expect(result.isAllSelected).toBe(false);
		});
	});
});
