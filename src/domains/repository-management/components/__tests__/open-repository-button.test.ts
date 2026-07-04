import { tick } from 'svelte';
import { vi } from 'vitest';
import OpenRepositoryButton from '../open-repository-button.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

// Mock the createGetRepositoryListQuery
const mockRepositoryListQuery = vi.hoisted(() => ({
	fn: vi.fn(() => ({
		data: [
			{
				id: 'test-repo-id',
				name: 'Test-Repo',
				path: '/path/to/repo',
				current_branch: 'main',
				branches_count: 0,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}
		],
		isLoading: false,
		isError: false,
		error: null
	}))
}));

vi.mock('$infrastructure/queries/create-get-repository-list-query', () => ({
	createGetRepositoryListQuery: mockRepositoryListQuery.fn
}));

// Mock notifications
const mockNotifications = vi.hoisted(() => ({
	push: vi.fn()
}));

vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: mockNotifications
}));

// Mock the opener plugin
const mockRevealItemInDir = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('@tauri-apps/plugin-opener', () => ({
	revealItemInDir: mockRevealItemInDir
}));

describe('OpenRepositoryButton', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRevealItemInDir.mockImplementation(() => Promise.resolve());
		mockRepositoryListQuery.fn.mockImplementation(() => ({
			data: [
				{
					id: 'test-repo-id',
					name: 'Test-Repo',
					path: '/path/to/repo',
					current_branch: 'main',
					branches_count: 0,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				}
			],
			isLoading: false,
			isError: false,
			error: null
		}));
	});

	test('should render the button', () => {
		const screen = renderWithTestWrapper(OpenRepositoryButton, {
			repositoryId: 'test-repo-id'
		});

		expect(screen.getByTestId('reveal-button')).toBeInTheDocument();
	});

	test('should reveal the repository path when clicked', async () => {
		const screen = renderWithTestWrapper(OpenRepositoryButton, {
			repositoryId: 'test-repo-id'
		});
		await tick();

		const button = screen.getByTestId('reveal-button');
		await button.click();
		await tick();

		expect(mockRevealItemInDir).toHaveBeenCalledWith('/path/to/repo');
		expect(mockNotifications.push).not.toHaveBeenCalled();
	});

	test('should push a danger notification when revealing fails', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		mockRevealItemInDir.mockImplementation(() => Promise.reject(new Error('boom')));

		const screen = renderWithTestWrapper(OpenRepositoryButton, {
			repositoryId: 'test-repo-id'
		});
		await tick();

		const button = screen.getByTestId('reveal-button');
		await button.click();
		await tick();

		expect(mockNotifications.push).toHaveBeenCalledWith({
			title: 'Could not open folder',
			message: 'Failed to reveal **Test-Repo** in the file manager',
			feedback: 'danger'
		});
		expect(consoleError).toHaveBeenCalled();
		consoleError.mockRestore();
	});

	test('should be disabled and not reveal when the repository is not found', async () => {
		mockRepositoryListQuery.fn.mockImplementation(() => ({
			data: [],
			isLoading: false,
			isError: false,
			error: null
		}));

		const screen = renderWithTestWrapper(OpenRepositoryButton, {
			repositoryId: 'missing-repo-id'
		});
		await tick();

		const button = screen.getByTestId('reveal-button');
		expect(button).toBeDisabled();

		// Guard clause: force past the disabled attribute to prove the handler's
		// `if (!repository) return` early-exit reveals nothing on its own.
		await button.click({ force: true });
		await tick();
		expect(mockRevealItemInDir).not.toHaveBeenCalled();
	});

	test('should have correct accessibility attributes', () => {
		const screen = renderWithTestWrapper(OpenRepositoryButton, {
			repositoryId: 'test-repo-id'
		});
		const button = screen.getByTestId('reveal-button');
		expect(button).toHaveAttribute('aria-label', 'Reveal repository in file manager');
	});
});
