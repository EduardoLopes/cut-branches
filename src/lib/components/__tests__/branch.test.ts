import { render } from '@testing-library/svelte';
import BranchComponent from '../branch.svelte';
import type { Branch } from '$lib/stores/repositories.svelte';

const mockBranch: Branch = {
	name: 'feature/test-branch',
	current: false,
	last_commit: {
		hash: 'abc123',
		message: 'Initial commit',
		author: 'John Doe',
		email: '<john.doe@example.com>',
		date: new Date().toISOString()
	},
	fully_merged: false
};

describe('Branch Component', () => {
	test('renders branch name', () => {
		const { getByTestId } = render(BranchComponent, {
			props: { data: mockBranch, selected: false }
		});
		expect(getByTestId('branch-name')).toBeInTheDocument();
	});

	test('renders last commit message', () => {
		const { getByTestId } = render(BranchComponent, {
			props: { data: mockBranch, selected: false }
		});
		expect(getByTestId('last-commit-message')).toBeInTheDocument();
	});

	test('renders author name', () => {
		const { getByTestId } = render(BranchComponent, {
			props: { data: mockBranch, selected: false }
		});
		expect(getByTestId('author-name')).toBeInTheDocument();
	});

	test('renders alerts for protected words', () => {
		const protectedBranch = { ...mockBranch, name: 'main' };
		const { getByTestId } = render(BranchComponent, {
			props: { data: protectedBranch, selected: true }
		});
		expect(getByTestId('protected-words-alert')).toBeInTheDocument();
	});

	test('renders alerts for offensive words', () => {
		const offensiveBranch = { ...mockBranch, name: 'master' };
		const { getByTestId } = render(BranchComponent, {
			props: { data: offensiveBranch, selected: true }
		});
		expect(getByTestId('offensive-words-alert')).toBeInTheDocument();
	});

	test('does not render current branch title when current is false', () => {
		const { queryByTitle } = render(BranchComponent, {
			props: { data: mockBranch, selected: false }
		});
		expect(queryByTitle('Current branch')).not.toBeInTheDocument();
	});

	test('renders current branch title when current is true', () => {
		const currentBranch = { ...mockBranch, current: true };
		const { getByTitle } = render(BranchComponent, {
			props: { data: currentBranch, selected: false }
		});
		expect(getByTitle('Current branch')).toBeInTheDocument();
	});

	test('renders fully merged alert when fully_merged is true and current is false', () => {
		const fullyMergedBranch = { ...mockBranch, fully_merged: true };
		const { getByText } = render(BranchComponent, {
			props: { data: fullyMergedBranch, selected: false }
		});
		expect(
			getByText('This branch is not fully merged into the current branch!')
		).toBeInTheDocument();
	});

	test('renders fully merged alert when fully_merged is true and current is true', () => {
		const fullyMergedCurrentBranch = { ...mockBranch, fully_merged: true, current: true };
		const { queryByText } = render(BranchComponent, {
			props: { data: fullyMergedCurrentBranch, selected: false }
		});
		expect(
			queryByText('This branch is not fully merged into the current branch!')
		).not.toBeInTheDocument();
	});

	test('does not render fully merged alert when fully_merged is false and current is false', () => {
		const { queryByText } = render(BranchComponent, {
			props: { data: mockBranch, selected: false }
		});
		expect(
			queryByText('This branch is not fully merged into the current branch!')
		).not.toBeInTheDocument();
	});

	test('does not render alerts when no conditions are met', () => {
		const { queryByTestId } = render(BranchComponent, {
			props: { data: mockBranch, selected: false }
		});
		expect(queryByTestId('protected-words-alert')).not.toBeInTheDocument();
		expect(queryByTestId('offensive-words-alert')).not.toBeInTheDocument();
	});
});
