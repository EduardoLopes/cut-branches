import { describe, it, expect } from 'vitest';
import { RepositoryPath } from '../repository-path';

describe('RepositoryPath', () => {
	describe('constructor', () => {
		it('should create a RepositoryPath with a valid Unix absolute path', () => {
			const path = '/path/to/repo';
			const repositoryPath = new RepositoryPath(path);

			expect(repositoryPath.getValue()).toBe(path);
		});

		it('should create a RepositoryPath with a valid Unix relative path', () => {
			const path = 'path/to/repo';
			const repositoryPath = new RepositoryPath(path);

			expect(repositoryPath.getValue()).toBe(path);
		});

		it('should create a RepositoryPath with a valid Windows absolute path', () => {
			const path = 'C:\\Users\\user\\repo';
			const repositoryPath = new RepositoryPath(path);

			expect(repositoryPath.getValue()).toBe(path);
		});

		it('should create a RepositoryPath with a valid Windows path using forward slashes', () => {
			const path = 'C:/Users/user/repo';
			const repositoryPath = new RepositoryPath(path);

			expect(repositoryPath.getValue()).toBe(path);
		});

		it('should create a RepositoryPath with a single directory', () => {
			const path = 'repo';
			const repositoryPath = new RepositoryPath(path);

			expect(repositoryPath.getValue()).toBe(path);
		});

		it('should create a RepositoryPath with root directory', () => {
			const path = '/';
			const repositoryPath = new RepositoryPath(path);

			expect(repositoryPath.getValue()).toBe(path);
		});

		it('should trim whitespace from the path', () => {
			const path = '  /path/to/repo  ';
			const repositoryPath = new RepositoryPath(path);

			expect(repositoryPath.getValue()).toBe('/path/to/repo');
		});

		it('should remove trailing slash from path', () => {
			const path = '/path/to/repo/';
			const repositoryPath = new RepositoryPath(path);

			expect(repositoryPath.getValue()).toBe('/path/to/repo');
		});

		it('should remove multiple trailing slashes', () => {
			const path = '/path/to/repo///';
			const repositoryPath = new RepositoryPath(path);

			expect(repositoryPath.getValue()).toBe('/path/to/repo');
		});

		it('should remove trailing backslash from Windows path', () => {
			const path = 'C:\\Users\\user\\repo\\';
			const repositoryPath = new RepositoryPath(path);

			expect(repositoryPath.getValue()).toBe('C:\\Users\\user\\repo');
		});

		it('should preserve root slash when removing trailing slashes', () => {
			const path = '/';
			const repositoryPath = new RepositoryPath(path);

			expect(repositoryPath.getValue()).toBe('/');
		});

		it('should create a RepositoryPath with dots in the path', () => {
			const path = '/path/to/../repo';
			const repositoryPath = new RepositoryPath(path);

			expect(repositoryPath.getValue()).toBe('/path/to/../repo');
		});

		it('should create a RepositoryPath with special characters', () => {
			const path = '/path/to/my-repo_123';
			const repositoryPath = new RepositoryPath(path);

			expect(repositoryPath.getValue()).toBe(path);
		});

		it('should create a RepositoryPath with spaces in directory names', () => {
			const path = '/path/to/my repo';
			const repositoryPath = new RepositoryPath(path);

			expect(repositoryPath.getValue()).toBe(path);
		});

		it('should throw an error for an empty string', () => {
			expect(() => new RepositoryPath('')).toThrow(
				'Invalid repository path: "". Expected a non-empty file system path.'
			);
		});

		it('should throw an error for a whitespace-only string', () => {
			expect(() => new RepositoryPath('   ')).toThrow(
				'Invalid repository path: "   ". Expected a non-empty file system path.'
			);
		});

		it('should throw an error for a path with null bytes', () => {
			expect(() => new RepositoryPath('/path/to\0/repo')).toThrow(
				'Invalid repository path: "/path/to\0/repo". Expected a non-empty file system path.'
			);
		});
	});

	describe('getValue', () => {
		it('should return the path value', () => {
			const path = '/path/to/repo';
			const repositoryPath = new RepositoryPath(path);

			expect(repositoryPath.getValue()).toBe(path);
		});

		it('should return normalized path', () => {
			const repositoryPath = new RepositoryPath('/path/to/repo/');

			expect(repositoryPath.getValue()).toBe('/path/to/repo');
		});
	});

	describe('getBasename', () => {
		it('should return the last directory name for Unix path', () => {
			const repositoryPath = new RepositoryPath('/path/to/repo');

			expect(repositoryPath.getBasename()).toBe('repo');
		});

		it('should return the last directory name for Windows path', () => {
			const repositoryPath = new RepositoryPath('C:\\Users\\user\\repo');

			expect(repositoryPath.getBasename()).toBe('repo');
		});

		it('should return the directory name for relative path', () => {
			const repositoryPath = new RepositoryPath('path/to/repo');

			expect(repositoryPath.getBasename()).toBe('repo');
		});

		it('should return the directory name for single segment', () => {
			const repositoryPath = new RepositoryPath('repo');

			expect(repositoryPath.getBasename()).toBe('repo');
		});

		it('should return empty string for root path', () => {
			const repositoryPath = new RepositoryPath('/');

			expect(repositoryPath.getBasename()).toBe('');
		});

		it('should handle path with trailing slash removed', () => {
			const repositoryPath = new RepositoryPath('/path/to/repo/');

			expect(repositoryPath.getBasename()).toBe('repo');
		});
	});

	describe('getDirectory', () => {
		it('should return parent directory for Unix path', () => {
			const repositoryPath = new RepositoryPath('/path/to/repo');

			expect(repositoryPath.getDirectory()).toBe('/path/to');
		});

		it('should return parent directory for Windows path', () => {
			const repositoryPath = new RepositoryPath('C:\\Users\\user\\repo');

			expect(repositoryPath.getDirectory()).toBe('C:\\Users\\user');
		});

		it('should return parent directory for relative path', () => {
			const repositoryPath = new RepositoryPath('path/to/repo');

			expect(repositoryPath.getDirectory()).toBe('path/to');
		});

		it('should return empty string for single segment', () => {
			const repositoryPath = new RepositoryPath('repo');

			expect(repositoryPath.getDirectory()).toBe('');
		});

		it('should return empty string for root path', () => {
			const repositoryPath = new RepositoryPath('/');

			expect(repositoryPath.getDirectory()).toBe('');
		});

		it('should preserve leading slash for absolute paths', () => {
			const repositoryPath = new RepositoryPath('/repo');

			expect(repositoryPath.getDirectory()).toBe('');
		});

		it('should handle multiple levels', () => {
			const repositoryPath = new RepositoryPath('/a/b/c/d/repo');

			expect(repositoryPath.getDirectory()).toBe('/a/b/c/d');
		});
	});

	describe('isAbsolute', () => {
		it('should return true for Unix absolute path', () => {
			const repositoryPath = new RepositoryPath('/path/to/repo');

			expect(repositoryPath.isAbsolute()).toBe(true);
		});

		it('should return true for root path', () => {
			const repositoryPath = new RepositoryPath('/');

			expect(repositoryPath.isAbsolute()).toBe(true);
		});

		it('should return true for Windows absolute path with backslash', () => {
			const repositoryPath = new RepositoryPath('C:\\Users\\user\\repo');

			expect(repositoryPath.isAbsolute()).toBe(true);
		});

		it('should return true for Windows absolute path with forward slash', () => {
			const repositoryPath = new RepositoryPath('C:/Users/user/repo');

			expect(repositoryPath.isAbsolute()).toBe(true);
		});

		it('should return true for Windows path with lowercase drive letter', () => {
			const repositoryPath = new RepositoryPath('c:/Users/user/repo');

			expect(repositoryPath.isAbsolute()).toBe(true);
		});

		it('should return false for relative path', () => {
			const repositoryPath = new RepositoryPath('path/to/repo');

			expect(repositoryPath.isAbsolute()).toBe(false);
		});

		it('should return false for single directory', () => {
			const repositoryPath = new RepositoryPath('repo');

			expect(repositoryPath.isAbsolute()).toBe(false);
		});

		it('should return false for path starting with ./', () => {
			const repositoryPath = new RepositoryPath('./path/to/repo');

			expect(repositoryPath.isAbsolute()).toBe(false);
		});

		it('should return false for path starting with ../', () => {
			const repositoryPath = new RepositoryPath('../path/to/repo');

			expect(repositoryPath.isAbsolute()).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for identical paths', () => {
			const path = '/path/to/repo';
			const repositoryPath1 = new RepositoryPath(path);
			const repositoryPath2 = new RepositoryPath(path);

			expect(repositoryPath1.equals(repositoryPath2)).toBe(true);
		});

		it('should return true for paths with different trailing slashes (normalized)', () => {
			const repositoryPath1 = new RepositoryPath('/path/to/repo');
			const repositoryPath2 = new RepositoryPath('/path/to/repo/');

			expect(repositoryPath1.equals(repositoryPath2)).toBe(true);
		});

		it('should return true for paths with different whitespace (trimmed)', () => {
			const repositoryPath1 = new RepositoryPath('/path/to/repo');
			const repositoryPath2 = new RepositoryPath('  /path/to/repo  ');

			expect(repositoryPath1.equals(repositoryPath2)).toBe(true);
		});

		it('should return false for different paths', () => {
			const repositoryPath1 = new RepositoryPath('/path/to/repo');
			const repositoryPath2 = new RepositoryPath('/path/to/other');

			expect(repositoryPath1.equals(repositoryPath2)).toBe(false);
		});

		it('should be case-sensitive in comparison', () => {
			const repositoryPath1 = new RepositoryPath('/path/to/repo');
			const repositoryPath2 = new RepositoryPath('/path/to/REPO');

			expect(repositoryPath1.equals(repositoryPath2)).toBe(false);
		});

		it('should return false for absolute vs relative path', () => {
			const repositoryPath1 = new RepositoryPath('/path/to/repo');
			const repositoryPath2 = new RepositoryPath('path/to/repo');

			expect(repositoryPath1.equals(repositoryPath2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return the path value', () => {
			const path = '/path/to/repo';
			const repositoryPath = new RepositoryPath(path);

			expect(repositoryPath.toString()).toBe(path);
		});

		it('should return normalized path', () => {
			const repositoryPath = new RepositoryPath('/path/to/repo/');

			expect(repositoryPath.toString()).toBe('/path/to/repo');
		});
	});
});
