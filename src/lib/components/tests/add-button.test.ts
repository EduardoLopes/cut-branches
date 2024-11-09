import '@testing-library/jest-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { render, fireEvent } from '@testing-library/svelte';
import { readable } from 'svelte/store';
import AddButton from '../add-button.svelte';
import TestWrapper from '../test-wrapper.svelte';
import { goto } from '$app/navigation';
import { notifications } from '$lib/stores/notifications.svelte';
import { repositories, type Repository } from '$lib/stores/repositories.svelte';

vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn().mockResolvedValue(Promise.resolve('/path/to/existing/repo'))
}));

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

vi.mock('$app/stores', () => {
	return {
		page: readable({ params: { id: '123' } })
	};
});

describe('AddButton', () => {
	test('renders correctly', () => {
		const { getByText } = render(TestWrapper, {
			props: { Component: AddButton }
		});
		expect(getByText('Add a git repository')).toBeInTheDocument();
	});

	test('calls handleAddClick on button click', async () => {
		const { getByRole } = render(TestWrapper, {
			props: { Component: AddButton, props: { visuallyHiddenLabel: true } }
		});
		const button = getByRole('button');
		await fireEvent.click(button);

		expect(open).toHaveBeenCalledWith({ directory: true });
	});

	test('displays visually hidden label when visuallyHiddenLabel is true', () => {
		const { container } = render(TestWrapper, {
			props: { Component: AddButton, props: { visuallyHiddenLabel: true } }
		});
		const span = container.querySelector('span');
		expect(span).toHaveClass('sr_true');
	});

	test('calls open function on button click', async () => {
		const { getByRole } = render(TestWrapper, {
			props: { Component: AddButton, props: { visuallyHiddenLabel: false } }
		});
		const button = getByRole('button');
		await fireEvent.click(button);

		expect(open).toHaveBeenCalledWith({ directory: true });
	});

	test('shows warning notification if repository already exists', async () => {
		const mockRepo: Repository = {
			id: '123',
			name: 'Existing Repo',
			path: '/path/to/existing/repo',
			branches: [],
			currentBranch: '',
			branchesCount: 0
		};

		repositories.findByPath = vi.fn().mockReturnValue(mockRepo);
		notifications.push = vi.fn();

		const { getByRole } = render(TestWrapper, {
			props: { Component: AddButton, props: { visuallyHiddenLabel: false } }
		});
		const button = getByRole('button');
		await fireEvent.click(button);

		expect(notifications.push).toHaveBeenCalledWith({
			title: `Repository ${mockRepo.name} already exists`,
			feedback: 'warning'
		});
	});

	test('navigates to existing repository if it already exists by ID', async () => {
		const mockRepo: Repository = {
			id: '123',
			name: 'Existing Repo',
			path: '/path/to/existing/repo',
			branches: [],
			currentBranch: '',
			branchesCount: 0
		};

		vi.mock('$lib/services/getRepoByPath', () => ({
			getRepoByPath: vi.fn().mockReturnValue({
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

		repositories.add(mockRepo);

		const { getByRole } = render(TestWrapper, {
			props: { Component: AddButton, props: { visuallyHiddenLabel: false } }
		});

		const button = getByRole('button');
		await fireEvent.click(button);

		expect(goto).toHaveBeenCalledWith(`/repos/${mockRepo.id}`);
	});
});
