import { describe, it, expect } from 'vitest';
import { CommitSha } from '../commit-sha';

describe('CommitSha', () => {
	describe('constructor', () => {
		it('should create a CommitSha with a valid full SHA', () => {
			const fullSha = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
			const commitSha = new CommitSha(fullSha);

			expect(commitSha.getValue()).toBe(fullSha);
		});

		it('should create a CommitSha with a valid short SHA (7 characters)', () => {
			const shortSha = 'a1b2c3d';
			const commitSha = new CommitSha(shortSha);

			expect(commitSha.getValue()).toBe(shortSha);
		});

		it('should create a CommitSha with a valid short SHA (8+ characters)', () => {
			const shortSha = 'a1b2c3d4e5';
			const commitSha = new CommitSha(shortSha);

			expect(commitSha.getValue()).toBe(shortSha);
		});

		it('should trim whitespace from the SHA', () => {
			const sha = '  a1b2c3d  ';
			const commitSha = new CommitSha(sha);

			expect(commitSha.getValue()).toBe('a1b2c3d');
		});

		it('should accept uppercase hexadecimal characters', () => {
			const sha = 'A1B2C3D';
			const commitSha = new CommitSha(sha);

			expect(commitSha.getValue()).toBe('A1B2C3D');
		});

		it('should accept mixed case hexadecimal characters', () => {
			const sha = 'A1b2C3d';
			const commitSha = new CommitSha(sha);

			expect(commitSha.getValue()).toBe('A1b2C3d');
		});

		it('should throw an error for an empty string', () => {
			expect(() => new CommitSha('')).toThrow(
				'Invalid commit SHA format: "". Expected 40-character full SHA or 7+ character short SHA (hexadecimal).'
			);
		});

		it('should throw an error for a whitespace-only string', () => {
			expect(() => new CommitSha('   ')).toThrow(
				'Invalid commit SHA format: "   ". Expected 40-character full SHA or 7+ character short SHA (hexadecimal).'
			);
		});

		it('should throw an error for a SHA that is too short (less than 7 chars)', () => {
			expect(() => new CommitSha('a1b2c3')).toThrow(
				'Invalid commit SHA format: "a1b2c3". Expected 40-character full SHA or 7+ character short SHA (hexadecimal).'
			);
		});

		it('should throw an error for non-hexadecimal characters', () => {
			expect(() => new CommitSha('g1b2c3d')).toThrow(
				'Invalid commit SHA format: "g1b2c3d". Expected 40-character full SHA or 7+ character short SHA (hexadecimal).'
			);
		});

		it('should throw an error for special characters', () => {
			expect(() => new CommitSha('a1b2c3d-e5f6')).toThrow(
				'Invalid commit SHA format: "a1b2c3d-e5f6". Expected 40-character full SHA or 7+ character short SHA (hexadecimal).'
			);
		});

		it('should throw an error for SHA with spaces', () => {
			expect(() => new CommitSha('a1b2c3d e5f6')).toThrow(
				'Invalid commit SHA format: "a1b2c3d e5f6". Expected 40-character full SHA or 7+ character short SHA (hexadecimal).'
			);
		});
	});

	describe('getValue', () => {
		it('should return the SHA value', () => {
			const sha = 'a1b2c3d4e5f';
			const commitSha = new CommitSha(sha);

			expect(commitSha.getValue()).toBe(sha);
		});
	});

	describe('getShortSha', () => {
		it('should return first 7 characters by default', () => {
			const fullSha = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
			const commitSha = new CommitSha(fullSha);

			expect(commitSha.getShortSha()).toBe('a1b2c3d');
		});

		it('should return custom length when specified', () => {
			const fullSha = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
			const commitSha = new CommitSha(fullSha);

			expect(commitSha.getShortSha(10)).toBe('a1b2c3d4e5');
		});

		it('should work with already short SHAs', () => {
			const shortSha = 'a1b2c3d4e5';
			const commitSha = new CommitSha(shortSha);

			expect(commitSha.getShortSha()).toBe('a1b2c3d');
		});

		it('should throw error if requested length is less than 4', () => {
			const sha = 'a1b2c3d4e5f';
			const commitSha = new CommitSha(sha);

			expect(() => commitSha.getShortSha(3)).toThrow(
				'Short SHA length must be at least 4 characters'
			);
		});

		it('should throw error if requested length exceeds SHA length', () => {
			const shortSha = 'a1b2c3d';
			const commitSha = new CommitSha(shortSha);

			expect(() => commitSha.getShortSha(10)).toThrow('Short SHA length 10 exceeds SHA length 7');
		});
	});

	describe('isFullSha', () => {
		it('should return true for a 40-character SHA', () => {
			const fullSha = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
			const commitSha = new CommitSha(fullSha);

			expect(commitSha.isFullSha()).toBe(true);
		});

		it('should return false for a short SHA', () => {
			const shortSha = 'a1b2c3d';
			const commitSha = new CommitSha(shortSha);

			expect(commitSha.isFullSha()).toBe(false);
		});

		it('should return false for a 39-character SHA', () => {
			const sha = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9';
			const commitSha = new CommitSha(sha);

			expect(commitSha.isFullSha()).toBe(false);
		});
	});

	describe('isShortSha', () => {
		it('should return true for a 7-character SHA', () => {
			const shortSha = 'a1b2c3d';
			const commitSha = new CommitSha(shortSha);

			expect(commitSha.isShortSha()).toBe(true);
		});

		it('should return true for a 10-character SHA', () => {
			const shortSha = 'a1b2c3d4e5';
			const commitSha = new CommitSha(shortSha);

			expect(commitSha.isShortSha()).toBe(true);
		});

		it('should return false for a 40-character SHA', () => {
			const fullSha = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
			const commitSha = new CommitSha(fullSha);

			expect(commitSha.isShortSha()).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for identical full SHAs', () => {
			const sha = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
			const commitSha1 = new CommitSha(sha);
			const commitSha2 = new CommitSha(sha);

			expect(commitSha1.equals(commitSha2)).toBe(true);
		});

		it('should return true for identical short SHAs', () => {
			const sha = 'a1b2c3d';
			const commitSha1 = new CommitSha(sha);
			const commitSha2 = new CommitSha(sha);

			expect(commitSha1.equals(commitSha2)).toBe(true);
		});

		it('should return true when short SHA matches beginning of full SHA', () => {
			const fullSha = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
			const shortSha = 'a1b2c3d';
			const commitSha1 = new CommitSha(fullSha);
			const commitSha2 = new CommitSha(shortSha);

			expect(commitSha1.equals(commitSha2)).toBe(true);
			expect(commitSha2.equals(commitSha1)).toBe(true);
		});

		it('should return true when comparing two different length short SHAs of the same commit', () => {
			const shortSha1 = 'a1b2c3d';
			const shortSha2 = 'a1b2c3d4e5';
			const commitSha1 = new CommitSha(shortSha1);
			const commitSha2 = new CommitSha(shortSha2);

			expect(commitSha1.equals(commitSha2)).toBe(true);
			expect(commitSha2.equals(commitSha1)).toBe(true);
		});

		it('should return false for completely different SHAs', () => {
			const sha1 = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
			const sha2 = 'f1e2d3c4b5a6978685746352413029180716a5b4';
			const commitSha1 = new CommitSha(sha1);
			const commitSha2 = new CommitSha(sha2);

			expect(commitSha1.equals(commitSha2)).toBe(false);
		});

		it('should return false when short SHA does not match beginning of full SHA', () => {
			const fullSha = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
			const shortSha = 'f1e2d3c';
			const commitSha1 = new CommitSha(fullSha);
			const commitSha2 = new CommitSha(shortSha);

			expect(commitSha1.equals(commitSha2)).toBe(false);
		});

		it('should be case-sensitive in comparison', () => {
			const sha1 = 'a1b2c3d';
			const sha2 = 'A1B2C3D';
			const commitSha1 = new CommitSha(sha1);
			const commitSha2 = new CommitSha(sha2);

			expect(commitSha1.equals(commitSha2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return the SHA value', () => {
			const sha = 'a1b2c3d4e5f';
			const commitSha = new CommitSha(sha);

			expect(commitSha.toString()).toBe(sha);
		});

		it('should work with full SHA', () => {
			const fullSha = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
			const commitSha = new CommitSha(fullSha);

			expect(commitSha.toString()).toBe(fullSha);
		});
	});
});
