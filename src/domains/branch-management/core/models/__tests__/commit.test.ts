import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Commit } from '../commit';
import { Email } from '$core/email';
import type { Commit as CommitData } from '$infrastructure/bindings';

describe('Commit', () => {
	let mockCommitData: CommitData;

	beforeEach(() => {
		mockCommitData = {
			sha: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
			shortSha: 'a1b2c3d',
			date: '2024-01-15T10:30:00.000Z',
			message: 'feat: add new feature',
			author: 'John Doe',
			email: 'john.doe@example.com'
		};
	});

	describe('fromData', () => {
		it('should create a Commit from valid data', () => {
			const commit = Commit.fromData(mockCommitData);

			expect(commit.getSha()).toBe(mockCommitData.sha);
			expect(commit.getMessage()).toBe(mockCommitData.message);
			expect(commit.getAuthor()).toBe(mockCommitData.author);
			expect(commit.getEmail()).toBe(mockCommitData.email);
		});

		it('should parse date correctly', () => {
			const commit = Commit.fromData(mockCommitData);

			expect(commit.getDate()).toEqual(new Date('2024-01-15T10:30:00.000Z'));
		});

		it('should create CommitSha value object from SHA', () => {
			const commit = Commit.fromData(mockCommitData);

			expect(commit.getSha()).toBe(mockCommitData.sha);
			expect(commit.getShortSha()).toBe('a1b2c3d');
		});

		it('should create Email value object from email', () => {
			const commit = Commit.fromData(mockCommitData);

			expect(commit.getEmail()).toBe('john.doe@example.com');
		});

		it('should throw error for invalid SHA', () => {
			const invalidData = { ...mockCommitData, sha: 'invalid' };

			expect(() => Commit.fromData(invalidData)).toThrow();
		});

		it('should throw error for invalid email', () => {
			const invalidData = { ...mockCommitData, email: 'not-an-email' };

			expect(() => Commit.fromData(invalidData)).toThrow();
		});

		it('should handle multiline commit messages', () => {
			const data = {
				...mockCommitData,
				message: 'feat: add feature\n\nThis is a detailed description\nwith multiple lines'
			};
			const commit = Commit.fromData(data);

			expect(commit.getMessage()).toBe(data.message);
		});
	});

	describe('toData', () => {
		it('should convert Commit back to data object', () => {
			const commit = Commit.fromData(mockCommitData);
			const data = commit.toData();

			expect(data.sha).toBe(mockCommitData.sha);
			expect(data.shortSha).toBe('a1b2c3d');
			expect(data.message).toBe(mockCommitData.message);
			expect(data.author).toBe(mockCommitData.author);
			expect(data.email).toBe(mockCommitData.email);
		});

		it('should convert date to ISO string', () => {
			const commit = Commit.fromData(mockCommitData);
			const data = commit.toData();

			expect(data.date).toBe('2024-01-15T10:30:00.000Z');
		});

		it('should round-trip correctly', () => {
			const commit = Commit.fromData(mockCommitData);
			const data = commit.toData();
			const commit2 = Commit.fromData(data);

			expect(commit.equals(commit2)).toBe(true);
		});
	});

	describe('getSha', () => {
		it('should return the full SHA', () => {
			const commit = Commit.fromData(mockCommitData);

			expect(commit.getSha()).toBe('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0');
		});
	});

	describe('getShortSha', () => {
		it('should return 7-character short SHA by default', () => {
			const commit = Commit.fromData(mockCommitData);

			expect(commit.getShortSha()).toBe('a1b2c3d');
		});

		it('should return custom length short SHA', () => {
			const commit = Commit.fromData(mockCommitData);

			expect(commit.getShortSha(10)).toBe('a1b2c3d4e5');
		});

		it('should return 4-character short SHA', () => {
			const commit = Commit.fromData(mockCommitData);

			expect(commit.getShortSha(4)).toBe('a1b2');
		});
	});

	describe('getDate', () => {
		it('should return the commit date', () => {
			const commit = Commit.fromData(mockCommitData);

			expect(commit.getDate()).toEqual(new Date('2024-01-15T10:30:00.000Z'));
		});
	});

	describe('getMessage', () => {
		it('should return the full commit message', () => {
			const commit = Commit.fromData(mockCommitData);

			expect(commit.getMessage()).toBe('feat: add new feature');
		});

		it('should return multiline message', () => {
			const data = {
				...mockCommitData,
				message: 'feat: add feature\n\nDetailed description'
			};
			const commit = Commit.fromData(data);

			expect(commit.getMessage()).toBe('feat: add feature\n\nDetailed description');
		});
	});

	describe('getShortMessage', () => {
		it('should return full message if under max length', () => {
			const commit = Commit.fromData(mockCommitData);

			expect(commit.getShortMessage(50)).toBe('feat: add new feature');
		});

		it('should truncate message if over max length', () => {
			const data = {
				...mockCommitData,
				message: 'This is a very long commit message that exceeds the maximum length'
			};
			const commit = Commit.fromData(data);

			expect(commit.getShortMessage(20)).toBe('This is a very lo...');
		});

		it('should use default max length of 50', () => {
			const data = {
				...mockCommitData,
				message: 'This is a commit message that is longer than fifty characters in total'
			};
			const commit = Commit.fromData(data);

			expect(commit.getShortMessage()).toBe('This is a commit message that is longer than fi...');
		});

		it('should handle edge case where message length equals max length', () => {
			const data = {
				...mockCommitData,
				message: '12345678901234567890' // exactly 20 chars
			};
			const commit = Commit.fromData(data);

			expect(commit.getShortMessage(20)).toBe('12345678901234567890');
		});
	});

	describe('getMessageFirstLine', () => {
		it('should return full message if single line', () => {
			const commit = Commit.fromData(mockCommitData);

			expect(commit.getMessageFirstLine()).toBe('feat: add new feature');
		});

		it('should return only first line of multiline message', () => {
			const data = {
				...mockCommitData,
				message: 'feat: add feature\n\nDetailed description\nMore details'
			};
			const commit = Commit.fromData(data);

			expect(commit.getMessageFirstLine()).toBe('feat: add feature');
		});

		it('should handle message with only newline', () => {
			const data = {
				...mockCommitData,
				message: 'First line\n'
			};
			const commit = Commit.fromData(data);

			expect(commit.getMessageFirstLine()).toBe('First line');
		});
	});

	describe('getAuthor', () => {
		it('should return the author name', () => {
			const commit = Commit.fromData(mockCommitData);

			expect(commit.getAuthor()).toBe('John Doe');
		});
	});

	describe('getEmail', () => {
		it('should return the author email', () => {
			const commit = Commit.fromData(mockCommitData);

			expect(commit.getEmail()).toBe('john.doe@example.com');
		});
	});

	describe('isAuthoredBy', () => {
		it('should return true if authored by given email', () => {
			const commit = Commit.fromData(mockCommitData);
			const email = new Email('john.doe@example.com');

			expect(commit.isAuthoredBy(email)).toBe(true);
		});

		it('should return true for case-insensitive email match', () => {
			const commit = Commit.fromData(mockCommitData);
			const email = new Email('JOHN.DOE@EXAMPLE.COM');

			expect(commit.isAuthoredBy(email)).toBe(true);
		});

		it('should return false if not authored by given email', () => {
			const commit = Commit.fromData(mockCommitData);
			const email = new Email('other@example.com');

			expect(commit.isAuthoredBy(email)).toBe(false);
		});
	});

	describe('getFormattedDate', () => {
		it('should format date with default options', () => {
			const commit = Commit.fromData(mockCommitData);
			const formatted = commit.getFormattedDate();

			// Format will vary by locale, just check it's a non-empty string
			expect(formatted).toBeTruthy();
			expect(typeof formatted).toBe('string');
		});

		it('should format date with custom options', () => {
			const commit = Commit.fromData(mockCommitData);
			const formatted = commit.getFormattedDate({
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});

			expect(formatted).toBeTruthy();
			expect(typeof formatted).toBe('string');
		});
	});

	describe('getRelativeTime', () => {
		beforeEach(() => {
			// Mock Date.now() to have consistent tests
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should return "just now" for recent commits', () => {
			const now = new Date('2024-01-15T10:30:30.000Z');
			vi.setSystemTime(now);

			const data = {
				...mockCommitData,
				date: '2024-01-15T10:30:00.000Z' // 30 seconds ago
			};
			const commit = Commit.fromData(data);

			expect(commit.getRelativeTime()).toBe('just now');
		});

		it('should return minutes for commits within an hour', () => {
			const now = new Date('2024-01-15T10:45:00.000Z');
			vi.setSystemTime(now);

			const commit = Commit.fromData(mockCommitData); // 15 minutes ago

			expect(commit.getRelativeTime()).toBe('15 minutes ago');
		});

		it('should return singular "minute" for 1 minute ago', () => {
			const now = new Date('2024-01-15T10:31:00.000Z');
			vi.setSystemTime(now);

			const commit = Commit.fromData(mockCommitData); // 1 minute ago

			expect(commit.getRelativeTime()).toBe('1 minute ago');
		});

		it('should return hours for commits within a day', () => {
			const now = new Date('2024-01-15T13:30:00.000Z');
			vi.setSystemTime(now);

			const commit = Commit.fromData(mockCommitData); // 3 hours ago

			expect(commit.getRelativeTime()).toBe('3 hours ago');
		});

		it('should return singular "hour" for 1 hour ago', () => {
			const now = new Date('2024-01-15T11:30:00.000Z');
			vi.setSystemTime(now);

			const commit = Commit.fromData(mockCommitData); // 1 hour ago

			expect(commit.getRelativeTime()).toBe('1 hour ago');
		});

		it('should return days for commits within a month', () => {
			const now = new Date('2024-01-20T10:30:00.000Z');
			vi.setSystemTime(now);

			const commit = Commit.fromData(mockCommitData); // 5 days ago

			expect(commit.getRelativeTime()).toBe('5 days ago');
		});

		it('should return singular "day" for 1 day ago', () => {
			const now = new Date('2024-01-16T10:30:00.000Z');
			vi.setSystemTime(now);

			const commit = Commit.fromData(mockCommitData); // 1 day ago

			expect(commit.getRelativeTime()).toBe('1 day ago');
		});

		it('should return months for commits within a year', () => {
			const now = new Date('2024-03-15T10:30:00.000Z');
			vi.setSystemTime(now);

			const commit = Commit.fromData(mockCommitData); // 2 months ago

			expect(commit.getRelativeTime()).toBe('2 months ago');
		});

		it('should return singular "month" for 1 month ago', () => {
			const now = new Date('2024-02-15T10:30:00.000Z');
			vi.setSystemTime(now);

			const commit = Commit.fromData(mockCommitData); // 1 month ago

			expect(commit.getRelativeTime()).toBe('1 month ago');
		});

		it('should return years for old commits', () => {
			const now = new Date('2026-01-15T10:30:00.000Z');
			vi.setSystemTime(now);

			const commit = Commit.fromData(mockCommitData); // 2 years ago

			expect(commit.getRelativeTime()).toBe('2 years ago');
		});

		it('should return singular "year" for 1 year ago', () => {
			const now = new Date('2025-01-15T10:30:00.000Z');
			vi.setSystemTime(now);

			const commit = Commit.fromData(mockCommitData); // 1 year ago

			expect(commit.getRelativeTime()).toBe('1 year ago');
		});
	});

	describe('equals', () => {
		it('should return true for commits with same SHA', () => {
			const commit1 = Commit.fromData(mockCommitData);
			const commit2 = Commit.fromData(mockCommitData);

			expect(commit1.equals(commit2)).toBe(true);
		});

		it('should return false for commits with different SHA', () => {
			const commit1 = Commit.fromData(mockCommitData);
			const data2 = {
				...mockCommitData,
				sha: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1'
			};
			const commit2 = Commit.fromData(data2);

			expect(commit1.equals(commit2)).toBe(false);
		});

		it('should return true even if other properties differ', () => {
			const commit1 = Commit.fromData(mockCommitData);
			const data2 = {
				...mockCommitData,
				message: 'Different message',
				author: 'Different Author'
			};
			const commit2 = Commit.fromData(data2);

			expect(commit1.equals(commit2)).toBe(true);
		});
	});

	describe('toString', () => {
		it('should return formatted string representation', () => {
			const commit = Commit.fromData(mockCommitData);
			const str = commit.toString();

			expect(str).toContain('a1b2c3d');
			expect(str).toContain('feat: add new feature');
			expect(str).toContain('John Doe');
		});

		it('should include only first line of multiline message', () => {
			const data = {
				...mockCommitData,
				message: 'feat: add feature\n\nDetailed description'
			};
			const commit = Commit.fromData(data);
			const str = commit.toString();

			expect(str).toContain('feat: add feature');
			expect(str).not.toContain('Detailed description');
		});
	});
});
