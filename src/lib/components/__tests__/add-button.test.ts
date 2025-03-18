import '@testing-library/jest-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { render, fireEvent } from '@testing-library/svelte';
import { readable } from 'svelte/store';
import type { Mock } from 'vitest';
import AddButton from '../add-button.svelte';
import TestWrapper from '../test-wrapper.svelte';
import { goto } from '$app/navigation';
import { notifications } from '$lib/stores/notifications.svelte';
import { type Repository } from '$lib/stores/repository.svelte';
import { getRepositoryStore } from '$lib/stores/repository.svelte';

vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn().mockResolvedValue('/path/to/existing/repo')
}));

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

vi.mock('$app/stores', () => {
	return {
		page: readable({ params: { id: '123' } })
	};
});

vi.mock('$lib/stores/notifications.svelte', () => ({
	notifications: {
		push: vi.fn()
	}
}));

vi.mock('$lib/services/createGetRepositoryByPathQuery', () => ({
	createGetRepositoryByPathQuery: vi.fn().mockReturnValue({
		isSuccess: true,
		data: {
			id: '123',
			name: 'Existing Repo',
			path: '/path/to/existing/repo',
			branches: [],
			currentBranch: '',
			branchesCount: 0
		}
	})
}));

describe('AddButton', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		test('renders correctly with default props', () => {
			const { getByText } = render(TestWrapper, {
				props: { component: AddButton }
			});
			expect(getByText('Add a git repository')).toBeInTheDocument();
		});

		test('displays visually hidden label when visuallyHiddenLabel is true', () => {
			const { container } = render(TestWrapper, {
				props: { component: AddButton, props: { visuallyHiddenLabel: true } }
			});
			const span = container.querySelector('span');
			expect(span).toHaveClass('sr_true');
		});

		test('displays visible label when visuallyHiddenLabel is false', () => {
			const { container } = render(TestWrapper, {
				props: { component: AddButton, props: { visuallyHiddenLabel: false } }
			});
			const span = container.querySelector('span');
			expect(span).not.toHaveClass('sr_true');
		});
	});

	describe('Interactions', () => {
		test('calls handleAddClick on button click', async () => {
			const { getByRole } = render(TestWrapper, {
				props: { component: AddButton, props: { visuallyHiddenLabel: true } }
			});
			const button = getByRole('button');
			await fireEvent.click(button);

			expect(open).toHaveBeenCalledWith({ directory: true });
		});

		test('calls open function on button click', async () => {
			const { getByRole } = render(TestWrapper, {
				props: { component: AddButton, props: { visuallyHiddenLabel: false } }
			});
			const button = getByRole('button');
			await fireEvent.click(button);

			expect(open).toHaveBeenCalledWith({ directory: true });
		});
	});

	describe('Repository handling', () => {
		let mockRepo: Repository;

		beforeEach(() => {
			mockRepo = {
				id: '123',
				name: 'Existing Repo',
				path: '/path/to/existing/repo',
				branches: [],
				currentBranch: '',
				branchesCount: 0
			};

			const repository = getRepositoryStore(mockRepo.name);
			repository?.clear();
			repository?.set(mockRepo);
		});

		test('shows warning notification if repository already exists', async () => {
			const { getByRole } = render(TestWrapper, {
				props: { component: AddButton, props: { visuallyHiddenLabel: false } }
			});

			const button = getByRole('button');
			await fireEvent.click(button);

			expect(notifications.push).toHaveBeenCalledWith({
				feedback: 'warning',
				title: 'Repository already exists',
				message: `The repository ${mockRepo.name} already exists`
			});
		});

		test('navigates to existing repository if it already exists by ID', async () => {
			const { getByRole } = render(TestWrapper, {
				props: { component: AddButton, props: { visuallyHiddenLabel: false } }
			});

			const button = getByRole('button');
			await fireEvent.click(button);

			expect(goto).toHaveBeenCalledWith(`/repos/${mockRepo.name}`);
		});

		test('handles error when directory selection fails', async () => {
			// Mock open to reject
			(open as Mock).mockRejectedValueOnce(new Error('User cancelled'));

			const { getByRole } = render(TestWrapper, {
				props: { component: AddButton }
			});

			const button = getByRole('button');
			await fireEvent.click(button);

			// No notifications or navigation should happen
			expect(notifications.push).toHaveBeenCalledWith({
				feedback: 'danger',
				message: new Error('User cancelled'),
				title: 'Error'
			});
			expect(goto).toHaveBeenCalledWith('/repos/Existing Repo');
		});
	});
});
