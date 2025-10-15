import { describe, test, expect } from 'vitest';
import {
	pluralize,
	formatSearchInfoText,
	formatCountInfoText
} from '../format-branch-selection-text';

describe('pluralize', () => {
	test('returns singular form when count is 1', () => {
		expect(pluralize(1, 'branch', 'branches')).toBe('branch');
	});

	test('returns plural form when count is 0', () => {
		expect(pluralize(0, 'branch', 'branches')).toBe('branches');
	});

	test('returns plural form when count is greater than 1', () => {
		expect(pluralize(5, 'branch', 'branches')).toBe('branches');
	});
});

describe('formatSearchInfoText', () => {
	test('formats text correctly with singular forms', () => {
		const result = formatSearchInfoText({
			selectedCount: 1,
			selectibleCount: 1,
			searchQuery: 'feature'
		});

		expect(result).toEqual({
			selectedLabel: 'branch',
			selectedVerb: 'is',
			selectibleLabel: 'branch',
			selectibleVerb: 'was',
			query: 'feature'
		});
	});

	test('formats text correctly with plural forms', () => {
		const result = formatSearchInfoText({
			selectedCount: 2,
			selectibleCount: 3,
			searchQuery: 'feature'
		});

		expect(result).toEqual({
			selectedLabel: 'branches',
			selectedVerb: 'are',
			selectibleLabel: 'branches',
			selectibleVerb: 'were',
			query: 'feature'
		});
	});

	test('trims whitespace from search query', () => {
		const result = formatSearchInfoText({
			selectedCount: 1,
			selectibleCount: 1,
			searchQuery: '  feature  '
		});

		expect(result.query).toBe('feature');
	});

	test('formats text correctly with 0 counts', () => {
		const result = formatSearchInfoText({
			selectedCount: 0,
			selectibleCount: 0,
			searchQuery: 'nonexistent'
		});

		expect(result).toEqual({
			selectedLabel: 'branches',
			selectedVerb: 'are',
			selectibleLabel: 'branches',
			selectibleVerb: 'were',
			query: 'nonexistent'
		});
	});
});

describe('formatCountInfoText', () => {
	test('formats text correctly with singular form', () => {
		expect(
			formatCountInfoText({
				selectedCount: 0,
				selectibleCount: 1
			})
		).toBe('0 / 1 branch');
	});

	test('formats text correctly with plural form', () => {
		expect(
			formatCountInfoText({
				selectedCount: 2,
				selectibleCount: 5
			})
		).toBe('2 / 5 branches');
	});

	test('formats text correctly when all selected', () => {
		expect(
			formatCountInfoText({
				selectedCount: 3,
				selectibleCount: 3
			})
		).toBe('3 / 3 branches');
	});

	test('formats text correctly with 0 counts', () => {
		expect(
			formatCountInfoText({
				selectedCount: 0,
				selectibleCount: 0
			})
		).toBe('0 / 0 branches');
	});
});
