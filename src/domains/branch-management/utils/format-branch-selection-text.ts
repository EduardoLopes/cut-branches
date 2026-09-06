/**
 * Text formatting utilities for branch selection UI
 */

/**
 * Pluralizes a word based on count
 */
export function pluralize(count: number, singular: string, plural: string): string {
	return count === 1 ? singular : plural;
}

export interface SearchInfoTextParams {
	selectedCount: number;
	selectibleCount: number;
	searchQuery: string;
}

export interface SearchInfoText {
	selectedLabel: string;
	selectedVerb: string;
	selectibleLabel: string;
	selectibleVerb: string;
	query: string;
}

/**
 * Formats the search info text for displaying selection results in search mode
 */
export function formatSearchInfoText({
	selectedCount,
	selectibleCount,
	searchQuery
}: SearchInfoTextParams): SearchInfoText {
	const selectedLabel = pluralize(selectedCount, 'branch', 'branches');
	const selectedVerb = pluralize(selectedCount, 'is', 'are');
	const selectibleLabel = pluralize(selectibleCount, 'branch', 'branches');
	const selectibleVerb = pluralize(selectibleCount, 'was', 'were');

	return {
		selectedLabel,
		selectedVerb,
		selectibleLabel,
		selectibleVerb,
		query: searchQuery.trim()
	};
}

export interface CountInfoTextParams {
	selectedCount: number;
	selectibleCount: number;
}

/**
 * Formats the count info text for displaying selection count
 */
export function formatCountInfoText({
	selectedCount,
	selectibleCount
}: CountInfoTextParams): string {
	const label = pluralize(selectibleCount, 'branch', 'branches');
	return `${selectedCount} / ${selectibleCount} ${label}`;
}
