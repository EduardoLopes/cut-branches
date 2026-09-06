import { describe, it, expect } from 'vitest';
import { RepositoryId } from '../repository-id';

describe('RepositoryId', () => {
	describe('constructor', () => {
		it('should create a RepositoryId with a valid ID', () => {
			const id = 'repo-123';
			const repositoryId = new RepositoryId(id);

			expect(repositoryId.getValue()).toBe(id);
		});

		it('should create a RepositoryId with alphanumeric characters', () => {
			const id = 'abc123XYZ';
			const repositoryId = new RepositoryId(id);

			expect(repositoryId.getValue()).toBe(id);
		});

		it('should create a RepositoryId with hyphens', () => {
			const id = 'repo-id-123';
			const repositoryId = new RepositoryId(id);

			expect(repositoryId.getValue()).toBe(id);
		});

		it('should create a RepositoryId with underscores', () => {
			const id = 'repo_id_123';
			const repositoryId = new RepositoryId(id);

			expect(repositoryId.getValue()).toBe(id);
		});

		it('should create a RepositoryId with UUID format', () => {
			const id = '550e8400-e29b-41d4-a716-446655440000';
			const repositoryId = new RepositoryId(id);

			expect(repositoryId.getValue()).toBe(id);
		});

		it('should create a RepositoryId with path-like format', () => {
			const id = '/path/to/repo';
			const repositoryId = new RepositoryId(id);

			expect(repositoryId.getValue()).toBe(id);
		});

		it('should trim whitespace from the ID', () => {
			const id = '  repo-123  ';
			const repositoryId = new RepositoryId(id);

			expect(repositoryId.getValue()).toBe('repo-123');
		});

		it('should create a RepositoryId with a single character', () => {
			const id = 'a';
			const repositoryId = new RepositoryId(id);

			expect(repositoryId.getValue()).toBe(id);
		});

		it('should create a RepositoryId with special characters', () => {
			const id = 'repo@123!';
			const repositoryId = new RepositoryId(id);

			expect(repositoryId.getValue()).toBe(id);
		});

		it('should throw an error for an empty string', () => {
			expect(() => new RepositoryId('')).toThrow(
				'Invalid repository ID: "". Expected a non-empty string identifier.'
			);
		});

		it('should throw an error for a whitespace-only string', () => {
			expect(() => new RepositoryId('   ')).toThrow(
				'Invalid repository ID: "   ". Expected a non-empty string identifier.'
			);
		});

		it('should throw an error for a tab-only string', () => {
			expect(() => new RepositoryId('\t\t')).toThrow(
				'Invalid repository ID: "\t\t". Expected a non-empty string identifier.'
			);
		});

		it('should throw an error for a newline-only string', () => {
			expect(() => new RepositoryId('\n')).toThrow(
				'Invalid repository ID: "\n". Expected a non-empty string identifier.'
			);
		});
	});

	describe('getValue', () => {
		it('should return the ID value', () => {
			const id = 'repo-123';
			const repositoryId = new RepositoryId(id);

			expect(repositoryId.getValue()).toBe(id);
		});

		it('should return trimmed ID value', () => {
			const repositoryId = new RepositoryId('  repo-123  ');

			expect(repositoryId.getValue()).toBe('repo-123');
		});
	});

	describe('equals', () => {
		it('should return true for identical IDs', () => {
			const id = 'repo-123';
			const repositoryId1 = new RepositoryId(id);
			const repositoryId2 = new RepositoryId(id);

			expect(repositoryId1.equals(repositoryId2)).toBe(true);
		});

		it('should return true for IDs with different whitespace (trimmed)', () => {
			const repositoryId1 = new RepositoryId('repo-123');
			const repositoryId2 = new RepositoryId('  repo-123  ');

			expect(repositoryId1.equals(repositoryId2)).toBe(true);
		});

		it('should return false for different IDs', () => {
			const repositoryId1 = new RepositoryId('repo-123');
			const repositoryId2 = new RepositoryId('repo-456');

			expect(repositoryId1.equals(repositoryId2)).toBe(false);
		});

		it('should be case-sensitive in comparison', () => {
			const repositoryId1 = new RepositoryId('repo-123');
			const repositoryId2 = new RepositoryId('REPO-123');

			expect(repositoryId1.equals(repositoryId2)).toBe(false);
		});

		it('should return false for similar but different IDs', () => {
			const repositoryId1 = new RepositoryId('repo-123');
			const repositoryId2 = new RepositoryId('repo-1234');

			expect(repositoryId1.equals(repositoryId2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return the ID value', () => {
			const id = 'repo-123';
			const repositoryId = new RepositoryId(id);

			expect(repositoryId.toString()).toBe(id);
		});

		it('should return trimmed ID value', () => {
			const repositoryId = new RepositoryId('  repo-123  ');

			expect(repositoryId.toString()).toBe('repo-123');
		});
	});
});
