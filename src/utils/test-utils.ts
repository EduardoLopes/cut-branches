import { vi, type MockedFunction } from 'vitest';
import type { Branch, Repository } from '$services/common';

// Type for the mocked invoke function
export type MockedInvoke = MockedFunction<typeof import('@tauri-apps/api/core').invoke>;

/**
 * Cast a mocked function to the proper MockedInvoke type
 * Usage: const mockedInvoke = getMockedInvoke(invoke);
 */
export function getMockedInvoke(invokeFn: unknown): MockedInvoke {
	return invokeFn as MockedInvoke;
}

/**
 * Mock data factories for creating test data
 */
export const mockDataFactory = {
	branch: (overrides: Partial<Branch> = {}): Branch => ({
		name: 'test-branch',
		current: false,
		lastCommit: {
			sha: 'abc123',
			shortSha: 'abc123'.substring(0, 7),
			date: '2023-01-01T00:00:00Z',
			message: 'Test commit',
			author: 'Test User',
			email: 'test@example.com'
		},
		fullyMerged: false,
		...overrides
	}),

	repository: (overrides: Partial<Repository> = {}): Repository => ({
		path: '/test/repo',
		name: 'test-repo',
		id: 'test-repo-id',
		currentBranch: 'main',
		branchesCount: 2,
		branches: [
			mockDataFactory.branch({ name: 'main', current: true }),
			mockDataFactory.branch({ name: 'feature', current: false })
		],
		...overrides
	}),

	deletedBranchInfo: (branch: Branch, rawOutput = `Deleted branch ${branch.name}`) => ({
		branch,
		raw_output: rawOutput
	})
};

/**
 * Tauri command mock helpers with proper typing
 */
export const tauriMocks = {
	/**
	 * Mock successful repository info retrieval
	 */
	mockGetRepoInfo: (mockedInvoke: MockedInvoke, repository: Repository) => {
		mockedInvoke.mockImplementation((command: string) => {
			if (command === 'get_repo_info') {
				return Promise.resolve(JSON.stringify(repository));
			}
			return Promise.reject(new Error(`Unexpected command: ${command}`));
		});
	},

	/**
	 * Mock successful branch switching
	 */
	mockSwitchBranch: (mockedInvoke: MockedInvoke, currentBranch = 'test-branch') => {
		mockedInvoke.mockImplementation((command: string) => {
			if (command === 'switch_branch') {
				return Promise.resolve({ currentBranch });
			}
			return Promise.reject(new Error(`Unexpected command: ${command}`));
		});
	},

	/**
	 * Mock successful branch deletion
	 */
	mockDeleteBranches: (
		mockedInvoke: MockedInvoke,
		deletedBranches: Array<{ branch: Branch; raw_output: string }>
	) => {
		mockedInvoke.mockImplementation((command: string) => {
			if (command === 'delete_branches') {
				return Promise.resolve(JSON.stringify(deletedBranches));
			}
			return Promise.reject(new Error(`Unexpected command: ${command}`));
		});
	},

	/**
	 * Mock successful branch restoration
	 */
	mockRestoreBranch: (mockedInvoke: MockedInvoke, restoredBranch: Branch) => {
		mockedInvoke.mockImplementation((command: string) => {
			if (command === 'restore_deleted_branch') {
				return Promise.resolve(JSON.stringify(restoredBranch));
			}
			return Promise.reject(new Error(`Unexpected command: ${command}`));
		});
	},

	/**
	 * Mock commit reachability check
	 */
	mockCheckCommitReachable: (mockedInvoke: MockedInvoke, isReachable: boolean) => {
		mockedInvoke.mockImplementation((command: string) => {
			if (command === 'check_commit_reachable') {
				return Promise.resolve(isReachable);
			}
			return Promise.reject(new Error(`Unexpected command: ${command}`));
		});
	},

	/**
	 * Mock multiple commands at once
	 */
	mockMultipleCommands: (mockedInvoke: MockedInvoke, commandMap: Record<string, unknown>) => {
		mockedInvoke.mockImplementation((command: string) => {
			if (command in commandMap) {
				const result = commandMap[command];
				// If it's an object/array, stringify it (like real Tauri behavior)
				if (typeof result === 'object' && result !== null) {
					return Promise.resolve(JSON.stringify(result));
				}
				return Promise.resolve(result);
			}
			return Promise.reject(new Error(`Unexpected command: ${command}`));
		});
	},

	/**
	 * Mock command failure
	 */
	mockCommandFailure: (mockedInvoke: MockedInvoke, command: string, error: Error | object) => {
		mockedInvoke.mockImplementation((cmd: string) => {
			if (cmd === command) {
				return Promise.reject(error);
			}
			return Promise.reject(new Error(`Unexpected command: ${cmd}`));
		});
	},

	/**
	 * Mock Tauri-specific error format
	 */
	mockTauriError: (mockedInvoke: MockedInvoke, command: string, message: string) => {
		const tauriError = {
			__TAURI_ERROR__: true,
			message,
			stack: 'Error stack trace'
		};
		tauriMocks.mockCommandFailure(mockedInvoke, command, tauriError);
	}
};

/**
 * Error mock helpers
 */
export const errorMocks = {
	/**
	 * Create a validation error like what would be thrown by the services
	 */
	validationError: (message: string, description?: string) => ({
		message,
		kind: 'validation_error',
		description: description || message
	}),

	/**
	 * Create a missing path error for queries
	 */
	missingPathError: () => ({
		message: 'No path provided',
		kind: 'missing_path',
		description: 'A repository path is required to fetch repository data'
	}),

	/**
	 * Create a missing path error for mutations
	 */
	missingPathMutationError: () => ({
		message: 'No path provided',
		kind: 'missing_path',
		description: 'A repository path is required to switch branches'
	}),

	/**
	 * Create a missing branches error
	 */
	missingBranchesError: () => ({
		message: 'No branches selected',
		kind: 'missing_branches',
		description: 'Please select at least one branch to delete'
	})
};

/**
 * Test setup helpers
 */
export const testSetup = {
	/**
	 * Setup basic invoke mock - call this in beforeEach
	 * Pass your mocked invoke function to get proper typing
	 */
	setupInvokeMock: (invokeFn: unknown) => {
		const mockedInvoke = getMockedInvoke(invokeFn);
		vi.clearAllMocks();
		return mockedInvoke;
	},

	/**
	 * Setup a complete repository test scenario
	 */
	setupRepositoryScenario: (mockedInvoke: MockedInvoke, customRepo?: Partial<Repository>) => {
		const repository = mockDataFactory.repository(customRepo);
		tauriMocks.mockGetRepoInfo(mockedInvoke, repository);
		return repository;
	},

	/**
	 * Setup a branch deletion test scenario
	 */
	setupBranchDeletionScenario: (mockedInvoke: MockedInvoke, branches: Branch[]) => {
		const deletedBranches = branches.map((branch) => mockDataFactory.deletedBranchInfo(branch));
		tauriMocks.mockDeleteBranches(mockedInvoke, deletedBranches);
		return deletedBranches;
	}
};

/**
 * Assertion helpers for common test patterns
 */
export const testAssertions = {
	/**
	 * Assert that invoke was called with specific command and parameters
	 */
	expectInvokeCalledWith: (mockedInvoke: MockedInvoke, command: string, params?: object) => {
		if (params) {
			expect(mockedInvoke).toHaveBeenCalledWith(command, params);
		} else {
			expect(mockedInvoke).toHaveBeenCalledWith(command);
		}
	},

	/**
	 * Assert that invoke was not called
	 */
	expectInvokeNotCalled: (mockedInvoke: MockedInvoke) => {
		expect(mockedInvoke).not.toHaveBeenCalled();
	},

	/**
	 * Assert that invoke was called with a specific command
	 */
	expectInvokeCalledWithCommand: (mockedInvoke: MockedInvoke, command: string) => {
		expect(mockedInvoke).toHaveBeenCalledWith(expect.stringMatching(command), expect.any(Object));
	}
};
