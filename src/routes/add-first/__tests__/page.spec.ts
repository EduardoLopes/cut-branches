import { open } from '@tauri-apps/plugin-dialog';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddFirstPage from '../+page.svelte';
import TestWrapper from '../../../lib/components/test-wrapper.svelte';

// Mock all required dependencies
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn().mockResolvedValue('/mock/path')
}));

// Mock repository query
vi.mock('$lib/services/createGetRepositoryByPathQuery', () => ({
	createGetRepositoryByPathQuery: vi.fn().mockReturnValue({
		isSuccess: false,
		isLoading: false,
		isError: false,
		data: null
	})
}));

// Mock repositories store to prevent any actual store operations
vi.mock('$lib/stores/repository.svelte', () => {
	const emptyRepositories = new Map();
	return {
		getRepositoryStore: vi.fn().mockImplementation((_id) => ({
			set: vi.fn(),
			state: null,
			clear: vi.fn()
		})),
		RepositoryStore: {
			repositories: emptyRepositories
		}
	};
});

describe('AddFirstPage Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the AddButton and attempts to open a directory dialog on click', async () => {
		render(TestWrapper, { props: { component: AddFirstPage } });

		const addButton = screen.getByRole('button');
		expect(addButton).toBeInTheDocument();

		// Check for the icon specifically if needed, though not strictly necessary for integration
		// const icon = screen.getByRole('img', { hidden: true }); // Adjust selector as needed
		// expect(icon).toBeInTheDocument();

		await fireEvent.click(addButton);
		// Verify that the dialog open function was called, instead of checking for navigation
		expect(open).toHaveBeenCalledWith({ directory: true, multiple: false });
	});

	it('displays the heading "Cut Branches"', () => {
		render(TestWrapper, { props: { component: AddFirstPage } });
		const heading = screen.getByRole('heading', { name: /Cut Branches/i });
		expect(heading).toBeInTheDocument();
	});
});
