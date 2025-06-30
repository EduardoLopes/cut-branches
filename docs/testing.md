# Test Utilities for Svelte Query & Tauri

This document explains how to use the test utilities for testing svelte-query mutations and queries with Tauri invoke calls.

## Overview

The test utilities provide a clean way to test svelte-query mutations and queries by mocking only the Tauri `invoke` function, letting svelte-query work normally. This approach provides better typing and cleaner test code.

## Key Benefits

- ✅ **Proper typing** - No type assertions needed
- ✅ **Simple mocking** - Mock only the `invoke` function
- ✅ **Reusable utilities** - No repetitive mock code
- ✅ **Easy error testing** - Built-in error helpers
- ✅ **Test data factories** - Consistent test data creation

## Basic Setup

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import {
	getMockedInvoke,
	mockDataFactory,
	tauriMocks,
	testSetup,
	testAssertions,
	type MockedInvoke
} from '$utils/test-utils';

// Mock only the Tauri invoke function
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

describe('YourService', () => {
	let mockedInvoke: MockedInvoke;

	beforeEach(() => {
		// Clean setup with proper typing
		mockedInvoke = testSetup.setupInvokeMock(invoke);
	});

	// Your tests here...
});
```

## Testing Mutations

### Basic Mutation Test

```typescript
it('should delete branches successfully', async () => {
	// Arrange: Create test data
	const branches = [
		mockDataFactory.branch({ name: 'feature-1' }),
		mockDataFactory.branch({ name: 'feature-2' })
	];

	// Setup mock response
	const expectedResult = testSetup.setupBranchDeletionScenario(mockedInvoke, branches);

	// Create the mutation
	const mutation = createDeleteBranchesMutation();

	// Wait for svelte-query to be ready
	await new Promise((resolve) => setTimeout(resolve, 0));

	// Trigger the mutation
	await new Promise((resolve, reject) => {
		mutation.mutate(
			{ path: '/test/repo', branches },
			{
				onSuccess: (data) => {
					// Assert the result
					expect(data).toEqual(expectedResult);
					testAssertions.expectInvokeCalledWith(mockedInvoke, 'delete_branches', {
						path: '/test/repo',
						branches: ['feature-1', 'feature-2']
					});
					resolve(data);
				},
				onError: reject
			}
		);
	});
});
```

### Error Handling Test

```typescript
it('should handle Tauri errors', async () => {
	// Setup error mock
	tauriMocks.mockTauriError(mockedInvoke, 'delete_branches', 'Git operation failed');

	const branches = [mockDataFactory.branch({ name: 'test-branch' })];
	const mutation = createDeleteBranchesMutation();

	await new Promise((resolve, reject) => {
		mutation.mutate(
			{ path: '/test/repo', branches },
			{
				onSuccess: () => reject(new Error('Should have failed')),
				onError: (error) => {
					expect(error).toMatchObject({
						message: 'Git operation failed'
					});
					resolve(error);
				}
			}
		);
	});
});
```

## Testing Queries

### Basic Query Test

```typescript
it('should fetch repository data successfully', async () => {
	// Setup mock data
	const mockRepo = testSetup.setupRepositoryScenario(mockedInvoke, {
		name: 'custom-repo',
		currentBranch: 'develop'
	});

	// Create query
	const query = createGetRepositoryByPathQuery(() => '/test/repo');

	// Wait for query to execute
	await new Promise((resolve) => setTimeout(resolve, 100));

	// Assert results
	expect(query.data).toEqual(mockRepo);
	testAssertions.expectInvokeCalledWith(mockedInvoke, 'get_repo_info', {
		path: '/test/repo'
	});
});
```

## Mock Data Factories

### Creating Test Data

```typescript
// Create a basic branch
const branch = mockDataFactory.branch({
	name: 'feature-branch',
	current: false,
	fullyMerged: true
});

// Create a repository with custom branches
const repo = mockDataFactory.repository({
	name: 'my-repo',
	branches: [
		mockDataFactory.branch({ name: 'main', current: true }),
		mockDataFactory.branch({ name: 'develop', current: false })
	]
});

// Create deleted branch info
const deletedInfo = mockDataFactory.deletedBranchInfo(branch, 'Custom deletion message');
```

## Tauri Command Mocking

### Single Command Mock

```typescript
// Mock successful repository fetch
tauriMocks.mockGetRepoInfo(mockedInvoke, repository);

// Mock successful branch switch
tauriMocks.mockSwitchBranch(mockedInvoke, 'Switched to main');

// Mock successful branch deletion
tauriMocks.mockDeleteBranches(mockedInvoke, deletedBranches);
```

### Multiple Commands Mock

```typescript
// Mock multiple commands at once
tauriMocks.mockMultipleCommands(mockedInvoke, {
	get_repo_info: repository,
	switch_branch: 'Switched successfully',
	check_commit_reachable: true
});
```

### Error Mocking

```typescript
// Mock Tauri-specific error
tauriMocks.mockTauriError(mockedInvoke, 'delete_branches', 'Permission denied');

// Mock general command failure
tauriMocks.mockCommandFailure(mockedInvoke, 'get_repo_info', new Error('Network error'));
```

## Error Helpers

```typescript
import { errorMocks } from '$utils/test-utils';

// Test validation errors
expect(error).toMatchObject(errorMocks.validationError('Invalid input'));

// Test missing path errors
expect(error).toMatchObject(errorMocks.missingPathError());

// Test missing branches errors
expect(error).toMatchObject(errorMocks.missingBranchesError());
```

## Test Assertions

```typescript
// Assert invoke was called with specific parameters
testAssertions.expectInvokeCalledWith(mockedInvoke, 'delete_branches', {
	path: '/repo',
	branches: ['branch1', 'branch2']
});

// Assert invoke was not called
testAssertions.expectInvokeNotCalled(mockedInvoke);

// Assert invoke was called with a specific command
testAssertions.expectInvokeCalledWithCommand(mockedInvoke, 'get_repo_info');
```

## Component Testing

For components that use svelte-query, mock only the invoke function:

```typescript
import { vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { testSetup, mockDataFactory } from '$utils/test-utils';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

describe('YourComponent', () => {
	let mockedInvoke: MockedInvoke;

	beforeEach(() => {
		mockedInvoke = testSetup.setupInvokeMock(invoke);
	});

	it('should handle user interactions', async () => {
		// Setup your mocks
		const mockData = mockDataFactory.repository();
		tauriMocks.mockGetRepoInfo(mockedInvoke, mockData);

		// Test your component
		const { getByRole } = render(YourComponent);

		// svelte-query works normally
		await fireEvent.click(getByRole('button'));

		// Assert the interactions
		testAssertions.expectInvokeCalledWith(mockedInvoke, 'get_repo_info', {
			path: expect.any(String)
		});
	});
});
```

## Available Utilities

### `testSetup`

- `setupInvokeMock(invoke)` - Convert mock to typed version
- `setupRepositoryScenario(mock, overrides)` - Setup repository test scenario
- `setupBranchDeletionScenario(mock, branches)` - Setup branch deletion scenario

### `tauriMocks`

- `mockGetRepoInfo(mock, data)` - Mock repository info fetch
- `mockSwitchBranch(mock, response)` - Mock branch switch
- `mockDeleteBranches(mock, result)` - Mock branch deletion
- `mockTauriError(mock, command, message)` - Mock Tauri errors
- `mockCommandFailure(mock, command, error)` - Mock command failures

### `mockDataFactory`

- `branch(overrides)` - Create branch objects
- `repository(overrides)` - Create repository objects
- `deletedBranchInfo(branch, message)` - Create deletion info

### `errorMocks`

- `validationError(message)` - Standard validation errors
- `missingPathError()` - Missing path errors
- `missingBranchesError()` - Missing branches errors

### `testAssertions`

- `expectInvokeCalledWith(mock, command, args)` - Assert specific invoke call
- `expectInvokeNotCalled(mock)` - Assert no invoke calls
- `expectInvokeCalledWithCommand(mock, command)` - Assert command called

## Examples

Check the `__tests__` directories in the services and components folders for real-world examples of these utilities in action.
