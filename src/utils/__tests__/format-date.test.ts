import { describe, it, expect } from 'vitest';
import { formatDate } from '../format-date';

describe('formatDate', () => {
	it('should format a date with PPPPpppp format', () => {
		// Create a specific date for consistent testing
		const date = new Date(2023, 0, 15, 13, 45, 30); // January 15, 2023, 13:45:30

		// Call the formatDate function
		const result = formatDate(date);

		// Check that the result matches the expected format
		// Example: "Sunday, January 15th, 2023 at 1:45:30 PM"
		expect(result).toContain('January 15th, 2023');
		expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/); // Contains time format
	});

	it('should accept date string as input', () => {
		// Test with a date string
		const dateString = '2023-02-20T10:30:00Z';
		const result = formatDate(dateString);

		// Verify the result contains expected date parts
		expect(result).toContain('February 20th, 2023');
	});

	it('should accept timestamp as input', () => {
		// Test with a timestamp (milliseconds since epoch)
		const timestamp = 1677234000000; // February 24, 2023
		const result = formatDate(timestamp);

		// Verify the result contains expected date parts
		expect(result).toContain('February 24th, 2023');
	});
});
