import '@testing-library/jest-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OnboardingCta from '../onboarding-cta.svelte';
import TestWrapper from '$components/test-wrapper.svelte';
import { notifications } from '$domains/notifications/store/notifications.svelte';

vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn().mockResolvedValue('/path/to/existing/repo')
}));

vi.mock('$domains/notifications/store/notifications.svelte', () => ({
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
		listRepositories: vi.fn().mockResolvedValue({
			status: 'ok',
			data: []
		})
	}
}));

describe('OnboardingCta', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should render the component', () => {
			render(TestWrapper, {
				props: { component: OnboardingCta }
			});

			expect(document.body.innerHTML).not.toBe('');
		});

		it('should display the call-to-action text', () => {
			const { getByText } = render(TestWrapper, {
				props: { component: OnboardingCta }
			});

			expect(getByText(/get started by adding your first git repository/i)).toBeInTheDocument();
		});

		it('should display the add repository button', () => {
			const { getByRole } = render(TestWrapper, {
				props: { component: OnboardingCta }
			});

			const button = getByRole('button', { name: /add repository/i });
			expect(button).toBeInTheDocument();
		});

		it('should render the button with content', () => {
			render(TestWrapper, {
				props: { component: OnboardingCta }
			});

			// Icon component may not render in test environment
			// Just verify the button renders with text
			expect(document.body.innerHTML).toContain('Add Repository');
		});

		it('should display feature highlights', () => {
			const { getByText } = render(TestWrapper, {
				props: { component: OnboardingCta }
			});

			expect(getByText(/clean with confidence/i)).toBeInTheDocument();
			expect(getByText(/track & restore/i)).toBeInTheDocument();
			expect(getByText(/bulk operations/i)).toBeInTheDocument();
		});
	});

	describe('Interactions', () => {
		it('should call open dialog on button click', async () => {
			const { getByRole } = render(TestWrapper, {
				props: { component: OnboardingCta }
			});

			const button = getByRole('button', { name: /add repository/i });
			await fireEvent.click(button);

			expect(open).toHaveBeenCalledWith({ directory: true, multiple: false });
		});

		it('should not trigger mutation when directory selection returns null', async () => {
			vi.clearAllMocks();
			vi.mocked(open).mockResolvedValueOnce(null);

			const { getByRole } = render(TestWrapper, {
				props: { component: OnboardingCta }
			});

			const button = getByRole('button', { name: /add repository/i });
			await fireEvent.click(button);

			await waitFor(() => expect(notifications.push).not.toHaveBeenCalled());
		});

		it('should handle error when directory selection fails', async () => {
			const mockError = new Error('Failed to open directory');
			vi.mocked(open).mockRejectedValueOnce(mockError);

			const { getByRole } = render(TestWrapper, {
				props: { component: OnboardingCta }
			});

			const button = getByRole('button', { name: /add repository/i });
			await fireEvent.click(button);

			await tick();

			expect(notifications.push).toHaveBeenCalledWith({
				title: 'Error',
				message: mockError.message,
				feedback: 'danger'
			});
		});
	});

	describe('Repository creation', () => {
		it('should successfully create a repository', async () => {
			vi.clearAllMocks();

			const mockRepo = {
				id: 'test-repo-id',
				name: 'Test Repo',
				path: '/path/to/existing/repo',
				branches: [],
				currentBranch: 'main',
				branchesCount: 0
			};

			vi.mocked(open).mockResolvedValueOnce('/path/to/existing/repo');

			const { getByRole } = render(TestWrapper, {
				props: { component: OnboardingCta }
			});

			const button = getByRole('button', { name: /add repository/i });
			await fireEvent.click(button);

			await tick();

			await waitFor(() => {
				expect(notifications.push).toHaveBeenCalledWith({
					feedback: 'success',
					title: 'Repository added',
					message: `The repository ${mockRepo.name} was added successfully`
				});
			});
		});

		it('should handle repository creation error', async () => {
			vi.clearAllMocks();

			const errorMessage = 'Repository not found';
			const errorDescription = 'The folder is not a git repository';

			const { commands } = await import('$lib/bindings');
			vi.mocked(commands.createRepository).mockRejectedValueOnce({
				message: errorMessage,
				description: errorDescription
			});

			vi.mocked(open).mockResolvedValueOnce('/invalid/git/repo');

			const { getByRole } = render(TestWrapper, {
				props: { component: OnboardingCta }
			});

			const button = getByRole('button', { name: /add repository/i });
			await fireEvent.click(button);

			await tick();

			await waitFor(() => {
				expect(notifications.push).toHaveBeenCalledWith(
					expect.objectContaining({
						feedback: 'danger'
					})
				);
			});
		});
	});

	describe('Loading state', () => {
		it('should not crash when rendered', () => {
			expect(() => {
				render(TestWrapper, {
					props: { component: OnboardingCta }
				});
			}).not.toThrow();
		});
	});
});
