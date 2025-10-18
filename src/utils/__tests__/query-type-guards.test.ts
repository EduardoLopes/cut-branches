import { describe, expect, test } from 'vitest';
import { hasRepoId, hasPath } from '../query-type-guards';

describe('hasRepoId', () => {
	test('should return true for valid GetBranchListInput object', () => {
		expect(hasRepoId({ repoId: 'test-repo-id' })).toBe(true);
		expect(hasRepoId({ repoId: 'test-repo-id', filters: {} })).toBe(true);
	});

	test('should return false for null', () => {
		expect(hasRepoId(null)).toBe(false);
	});

	test('should return false for undefined', () => {
		expect(hasRepoId(undefined)).toBe(false);
	});

	test('should return false for non-object values', () => {
		expect(hasRepoId('string')).toBe(false);
		expect(hasRepoId(123)).toBe(false);
		expect(hasRepoId(true)).toBe(false);
	});

	test('should return false for object without repoId property', () => {
		expect(hasRepoId({})).toBe(false);
		expect(hasRepoId({ id: 'test' })).toBe(false);
	});

	test('should return false for object with non-string repoId', () => {
		expect(hasRepoId({ repoId: 123 })).toBe(false);
		expect(hasRepoId({ repoId: null })).toBe(false);
		expect(hasRepoId({ repoId: undefined })).toBe(false);
		expect(hasRepoId({ repoId: {} })).toBe(false);
	});
});

describe('hasPath', () => {
	test('should return true for valid GetRepositoryInput object', () => {
		expect(hasPath({ path: '/test/path' })).toBe(true);
		expect(hasPath({ path: '' })).toBe(true);
	});

	test('should return false for null', () => {
		expect(hasPath(null)).toBe(false);
	});

	test('should return false for undefined', () => {
		expect(hasPath(undefined)).toBe(false);
	});

	test('should return false for non-object values', () => {
		expect(hasPath('string')).toBe(false);
		expect(hasPath(123)).toBe(false);
		expect(hasPath(true)).toBe(false);
	});

	test('should return false for object without path property', () => {
		expect(hasPath({})).toBe(false);
		expect(hasPath({ id: 'test' })).toBe(false);
	});

	test('should return false for object with non-string path', () => {
		expect(hasPath({ path: 123 })).toBe(false);
		expect(hasPath({ path: null })).toBe(false);
		expect(hasPath({ path: undefined })).toBe(false);
		expect(hasPath({ path: {} })).toBe(false);
	});
});
