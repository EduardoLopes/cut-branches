import { createRawSnippet, tick } from 'svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WelcomeModal from '../welcome-modal.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

// Mutable query state driven per test
let mockData: Array<{ id: string }> = [];
let mockIsPending = false;
let mockIsLoading = false;

vi.mock('$infrastructure/queries/create-get-repository-list-query', () => ({
	createGetRepositoryListQuery: vi.fn(() => ({
		get data() {
			return mockData;
		},
		get isPending() {
			return mockIsPending;
		},
		get isLoading() {
			return mockIsLoading;
		}
	}))
}));

const actionButton = createRawSnippet(() => ({
	render: () => '<button type="button">Add a git repository</button>'
}));

async function settle() {
	await tick();
	await tick();
}

describe('WelcomeModal', () => {
	beforeEach(() => {
		mockData = [];
		mockIsPending = false;
		mockIsLoading = false;
		vi.clearAllMocks();
	});

	it('opens automatically when the repository list is empty', async () => {
		const screen = renderWithTestWrapper(WelcomeModal, { actionButton });
		await settle();

		const dialogElement = screen.getByTestId('welcome-modal').element() as HTMLDialogElement;
		await vi.waitFor(() => expect(dialogElement.open).toBe(true));

		expect(
			screen.getByText(/manage and clean up your git branches effortlessly/i)
		).toBeInTheDocument();
		expect(screen.getByTestId('welcome-continue')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /add a git repository/i })).toBeInTheDocument();
	});

	it('stays closed while the query is still loading', async () => {
		mockIsPending = true;
		const screen = renderWithTestWrapper(WelcomeModal, { actionButton });
		await settle();

		const dialogElement = screen.getByTestId('welcome-modal').element() as HTMLDialogElement;
		expect(dialogElement.open).toBe(false);
	});

	it('stays closed when repositories already exist', async () => {
		mockData = [{ id: '1' }];
		const screen = renderWithTestWrapper(WelcomeModal, { actionButton });
		await settle();

		const dialogElement = screen.getByTestId('welcome-modal').element() as HTMLDialogElement;
		expect(dialogElement.open).toBe(false);
	});

	it('closes when the user clicks Continue', async () => {
		const screen = renderWithTestWrapper(WelcomeModal, { actionButton });
		await settle();

		const dialogElement = screen.getByTestId('welcome-modal').element() as HTMLDialogElement;
		await vi.waitFor(() => expect(dialogElement.open).toBe(true));

		await screen.getByTestId('welcome-continue').click();
		await settle();

		await vi.waitFor(() => expect(dialogElement.open).toBe(false));
	});
});
