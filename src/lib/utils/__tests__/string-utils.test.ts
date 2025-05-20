import { describe, it, expect } from 'vitest';
import {
	isEmptyString,
	ensureString,
	truncateString,
	cleanEmailString,
	toTitleCase,
	containsAnyWord,
	formatString
} from '../string-utils';

describe('string-utils', () => {
	describe('isEmptyString', () => {
		it('should return true for null or undefined values', () => {
			expect(isEmptyString(null)).toBe(true);
			expect(isEmptyString(undefined)).toBe(true);
		});

		it('should return true for empty string or whitespace', () => {
			expect(isEmptyString('')).toBe(true);
			expect(isEmptyString('   ')).toBe(true);
			expect(isEmptyString('\n\t')).toBe(true);
		});

		it('should return false for non-empty strings', () => {
			expect(isEmptyString('hello')).toBe(false);
			expect(isEmptyString(' hello ')).toBe(false);
		});
	});

	describe('ensureString', () => {
		it('should return the input string when not null or undefined', () => {
			expect(ensureString('hello')).toBe('hello');
			expect(ensureString('   ')).toBe('   ');
		});

		it('should return empty string for null or undefined when no default provided', () => {
			expect(ensureString(null)).toBe('');
			expect(ensureString(undefined)).toBe('');
		});

		it('should return the default value for null or undefined when provided', () => {
			expect(ensureString(null, 'default')).toBe('default');
			expect(ensureString(undefined, 'default')).toBe('default');
		});
	});

	describe('truncateString', () => {
		it('should not modify strings shorter than max length', () => {
			expect(truncateString('hello', 10)).toBe('hello');
			expect(truncateString('', 10)).toBe('');
		});

		it('should truncate strings longer than max length', () => {
			expect(truncateString('hello world', 5)).toBe('hello...');
			expect(truncateString('abcdefghijklmnop', 10)).toBe('abcdefghij...');
		});

		it('should use custom ellipsis when provided', () => {
			expect(truncateString('hello world', 5, '…')).toBe('hello…');
			expect(truncateString('hello world', 5, ' [more]')).toBe('hello [more]');
		});
	});

	describe('cleanEmailString', () => {
		it('should remove angle brackets from emails', () => {
			expect(cleanEmailString('<test@example.com>')).toBe('test@example.com');
			expect(cleanEmailString('<user.name@domain.co>')).toBe('user.name@domain.co');
		});

		it('should not modify strings without angle brackets', () => {
			expect(cleanEmailString('test@example.com')).toBe('test@example.com');
		});

		it('should handle partial angle brackets correctly', () => {
			expect(cleanEmailString('<test@example.com')).toBe('test@example.com');
			expect(cleanEmailString('test@example.com>')).toBe('test@example.com');
		});
	});

	describe('toTitleCase', () => {
		it('should convert strings to title case', () => {
			expect(toTitleCase('hello world')).toBe('Hello World');
			expect(toTitleCase('the quick brown fox')).toBe('The Quick Brown Fox');
		});

		it('should handle empty strings', () => {
			expect(toTitleCase('')).toBe('');
		});

		it('should handle strings with mixed case', () => {
			expect(toTitleCase('HeLLo WoRLd')).toBe('Hello World');
		});
	});

	describe('containsAnyWord', () => {
		it('should return true if string contains any word from the list', () => {
			expect(containsAnyWord('hello world', ['hello', 'test'])).toBe(true);
			expect(containsAnyWord('feature/main-branch', ['main', 'develop'])).toBe(true);
		});

		it('should return false if string does not contain any word from the list', () => {
			expect(containsAnyWord('hello world', ['foo', 'bar'])).toBe(false);
		});

		it('should handle empty inputs', () => {
			expect(containsAnyWord('', ['test'])).toBe(false);
			expect(containsAnyWord('test', [])).toBe(false);
		});
	});

	describe('formatString', () => {
		it('should replace placeholders with values', () => {
			expect(formatString('Hello {name}', { name: 'John' })).toBe('Hello John');
			expect(formatString('{greeting} {name}!', { greeting: 'Hi', name: 'Alice' })).toBe(
				'Hi Alice!'
			);
		});

		it('should handle missing values', () => {
			expect(formatString('Hello {name}', {})).toBe('Hello ');
			expect(formatString('{greeting} {name}!', { greeting: 'Hi' })).toBe('Hi !');
		});

		it('should handle non-string values', () => {
			expect(formatString('Count: {count}', { count: 42 })).toBe('Count: 42');
			expect(formatString('Is active: {active}', { active: true })).toBe('Is active: true');
		});
	});
});
