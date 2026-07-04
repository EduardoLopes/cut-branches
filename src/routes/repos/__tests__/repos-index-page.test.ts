import { describe, it, expect, vi } from 'vitest';
import ReposIndexPage from '../+page.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

// Stub the cross-domain add button so the empty-state page renders without the
// Tauri dialog/mutation stack.
vi.mock('$domains/repository-management/components/add-repository-button.svelte', async () => {
	const AddButtonStub = (await import('./add-button-stub.svelte')).default;
	return { default: AddButtonStub };
});

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('Repos index (empty app) page', () => {
	it('renders the empty state and an add-repository action', () => {
		const screen = renderWithTestWrapper(ReposIndexPage);

		expect(screen.getByTestId('repos-empty-state')).toBeInTheDocument();
		expect(screen.getByText(/no repositories yet/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /add a git repository/i })).toBeInTheDocument();
	});
});
