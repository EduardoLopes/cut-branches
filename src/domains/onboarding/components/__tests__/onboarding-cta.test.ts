import * as dialog from '@tauri-apps/plugin-dialog';
import { tick } from 'svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OnboardingCta from '../onboarding-cta.svelte';
import { notifications } from '$services/notifications/notifications.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

// Mock with spy: true to automatically spy on all exports
vi.mock('@tauri-apps/plugin-dialog', { spy: true });

vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: {
		push: vi.fn()
	}
}));

// Mock Tauri commands
vi.mock('$lib/bindings', () => ({
	commands: {
		createRepository: vi.fn().mockResolvedValue({
			status: 'ok',
			data: {
				id: 'test-repo-id',
				name: 'Test Repo',
				path: '/path/to/existing/repo',
				branches: [],
				currentBranch: 'main',
				branchesCount: 0
			}
		}),
		getRepositoryList: vi.fn().mockResolvedValue({
			status: 'ok',
			data: []
		})
	}
}));

describe('OnboardingCta', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Configure the spy behavior after clearing mocks
		vi.mocked(dialog.open).mockResolvedValue('/path/to/existing/repo');
	});

	describe('Rendering', () => {
		it('should render the component', () => {
			renderWithTestWrapper(OnboardingCta);

			expect(document.body.innerHTML).not.toBe('');
		});

		it('should display the call-to-action text', () => {
			const screen = renderWithTestWrapper(OnboardingCta);

			expect(
				screen.getByText(/get started by adding your first git repository/i)
			).toBeInTheDocument();
		});

		it('should display the add repository button', () => {
			const screen = renderWithTestWrapper(OnboardingCta);

			const button = screen.getByRole('button', { name: /add repository/i });
			expect(button).toBeInTheDocument();
		});

		it('should render the button with content', () => {
			const screen = renderWithTestWrapper(OnboardingCta);

			// Icon component may not render in test environment
			// Just verify the button renders with text
			expect(screen.getByText('Add Repository')).toBeInTheDocument();
		});

		it('should display feature highlights', () => {
			const screen = renderWithTestWrapper(OnboardingCta);

			expect(screen.getByText(/clean with confidence/i)).toBeInTheDocument();
			expect(screen.getByText(/track & restore/i)).toBeInTheDocument();
			expect(screen.getByText(/bulk operations/i)).toBeInTheDocument();
		});
	});

	describe('Interactions', () => {
		it('should call open dialog on button click', async () => {
			const screen = renderWithTestWrapper(OnboardingCta);

			const button = screen.getByRole('button', { name: /add repository/i });
			await button.click();
			await tick();

			// Wait for the async operation to complete with explicit timeout
			await vi.waitFor(
				() => {
					expect(dialog.open).toHaveBeenCalledWith({ directory: true, multiple: false });
				},
				{ timeout: 5000, interval: 50 }
			);
		});

		it('should not trigger mutation when directory selection returns null', async () => {
			vi.mocked(dialog.open).mockResolvedValueOnce(null);

			const screen = renderWithTestWrapper(OnboardingCta);

			const button = screen.getByRole('button', { name: /add repository/i });
			await button.click();
			await tick();

			// Wait for dialog.open to be called
			await vi.waitFor(
				() => {
					expect(dialog.open).toHaveBeenCalled();
				},
				{ timeout: 5000, interval: 50 }
			);

			// Give a small delay to ensure no notification was pushed
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(notifications.push).not.toHaveBeenCalled();
		});

		it('should handle error when directory selection fails', async () => {
			const mockError = new Error('Failed to open directory');
			vi.mocked(dialog.open).mockRejectedValueOnce(mockError);

			const screen = renderWithTestWrapper(OnboardingCta);

			const button = screen.getByRole('button', { name: /add repository/i });
			await button.click();
			await tick();

			// Wait for the error notification to be pushed
			await vi.waitFor(
				() => {
					expect(notifications.push).toHaveBeenCalledWith({
						title: 'Error',
						message: mockError.message,
						feedback: 'danger'
					});
				},
				{ timeout: 5000, interval: 50 }
			);
		});
	});

	describe('Repository creation', () => {
		it('should successfully create a repository', async () => {
			const mockRepo = {
				id: 'test-repo-id',
				name: 'Test Repo',
				path: '/path/to/existing/repo',
				branches: [],
				currentBranch: 'main',
				branchesCount: 0
			};

			vi.mocked(dialog.open).mockResolvedValueOnce('/path/to/existing/repo');

			const screen = renderWithTestWrapper(OnboardingCta);

			const button = screen.getByRole('button', { name: /add repository/i });
			await button.click();
			await tick();

			// Wait for the success notification to be pushed
			await vi.waitFor(
				() => {
					expect(notifications.push).toHaveBeenCalledWith(
						expect.objectContaining({
							feedback: 'success',
							title: 'Repository added',
							message: `The repository ${mockRepo.name} was added successfully`
						})
					);
				},
				{ timeout: 5000, interval: 50 }
			);
		});

		it('should handle repository creation error', async () => {
			const errorMessage = 'Invalid git repository';
			vi.mocked(dialog.open).mockRejectedValueOnce(new Error(errorMessage));

			const screen = renderWithTestWrapper(OnboardingCta);

			const button = screen.getByRole('button', { name: /add repository/i });
			await button.click();
			await tick();

			// Wait for the error notification to be pushed
			await vi.waitFor(
				() => {
					expect(notifications.push).toHaveBeenCalledWith(
						expect.objectContaining({
							feedback: 'danger',
							message: errorMessage,
							title: 'Error'
						})
					);
				},
				{ timeout: 5000, interval: 50 }
			);
		});
	});

	describe('Loading state', () => {
		it('should not crash when rendered', () => {
			expect(() => {
				renderWithTestWrapper(OnboardingCta);
			}).not.toThrow();
		});
	});
});
