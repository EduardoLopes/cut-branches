import { render } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import Branch from '../branch.svelte';
import type { Branch as BranchType } from '$lib/services/common';

const mockBranch: BranchType = {
	name: 'feature/test-branch',
	current: false,
	lastCommit: {
		sha: 'abcdef',
		shortSha: 'abcdef'.substring(0, 7),
		date: new Date().toISOString(),
		message: 'Test commit message',
		author: 'Test Author',
		email: 'test@example.com'
	},
	fullyMerged: false
};

describe('Branch Component', () => {
	describe('Basic Rendering', () => {
		test('renders branch name', () => {
			const { getByTestId } = render(Branch, {
				props: { data: mockBranch, selected: false }
			});
			expect(getByTestId('branch-name')).toBeInTheDocument();
		});

		test('renders last commit message', () => {
			const { getByTestId } = render(Branch, {
				props: { data: mockBranch, selected: false }
			});
			expect(getByTestId('last-commit-message')).toBeInTheDocument();
		});

		test('renders author name', () => {
			const { getByTestId } = render(Branch, {
				props: { data: mockBranch, selected: false }
			});
			expect(getByTestId('author-name')).toBeInTheDocument();
		});

		test('renders correct branch name text', () => {
			const { getByTestId } = render(Branch, {
				props: { data: mockBranch, selected: false }
			});
			expect(getByTestId('branch-name').textContent).toBe(mockBranch.name);
		});

		test('renders correct commit message text', () => {
			const { getByTestId } = render(Branch, {
				props: { data: mockBranch, selected: false }
			});
			expect(getByTestId('last-commit-message').textContent).toBe(mockBranch.lastCommit.message);
		});

		test('renders correct author name text', () => {
			const { getByTestId } = render(Branch, {
				props: { data: mockBranch, selected: false }
			});
			expect(getByTestId('author-name').textContent).toBe(` ${mockBranch.lastCommit.author}`);
		});
	});

	describe('Protected and Offensive Words', () => {
		test('renders alerts for protected words', () => {
			const protectedBranch = { ...mockBranch, name: 'main' };
			const { getByTestId } = render(Branch, {
				props: { data: protectedBranch, selected: true }
			});
			expect(getByTestId('protected-words-alert')).toBeInTheDocument();
		});

		test('renders alerts for offensive words', () => {
			const offensiveBranch = { ...mockBranch, name: 'master' };
			const { getByTestId } = render(Branch, {
				props: { data: offensiveBranch, selected: true }
			});
			expect(getByTestId('offensive-words-alert')).toBeInTheDocument();
		});

		test('does not render alerts when no protected or offensive words are present', () => {
			const { queryByTestId } = render(Branch, {
				props: { data: mockBranch, selected: false }
			});
			expect(queryByTestId('protected-words-alert')).not.toBeInTheDocument();
			expect(queryByTestId('offensive-words-alert')).not.toBeInTheDocument();
		});

		test('renders protected word alert with appropriate message', () => {
			const protectedBranch = { ...mockBranch, name: 'main' };
			const { getByTestId } = render(Branch, {
				props: { data: protectedBranch, selected: true }
			});
			const alertElement = getByTestId('protected-words-alert');
			expect(alertElement.textContent).toContain('main');
		});

		test('renders offensive word alert with appropriate message', () => {
			const offensiveBranch = { ...mockBranch, name: 'master' };
			const { getByTestId } = render(Branch, {
				props: { data: offensiveBranch, selected: true }
			});
			const alertElement = getByTestId('offensive-words-alert');
			expect(alertElement.textContent).toContain('master');
		});
	});

	describe('Current Branch Indicator', () => {
		test('does not render current branch title when current is false', () => {
			const { queryByTitle } = render(Branch, {
				props: { data: mockBranch, selected: false }
			});
			expect(queryByTitle('Current branch')).not.toBeInTheDocument();
		});

		test('renders current branch title when current is true', () => {
			const currentBranch = { ...mockBranch, current: true };
			const { getByTitle } = render(Branch, {
				props: { data: currentBranch, selected: false }
			});
			expect(getByTitle('Current branch')).toBeInTheDocument();
		});
	});

	describe('Merge Status', () => {
		test('renders fully merged alert when fullyMerged is true and current is false', () => {
			const fullyMergedBranch = { ...mockBranch, fullyMerged: true, name: 'merged-branch' };
			const { getByText, container } = render(Branch, {
				props: { data: fullyMergedBranch, selected: false }
			});
			expect(
				getByText('This branch is not fully merged into the current branch!')
			).toBeInTheDocument();

			const alertElement = container.querySelector('#branch-merged-branch-alert-fullyMerged');
			expect(alertElement).toBeInTheDocument();
			expect(alertElement?.textContent).toContain(
				'This branch is not fully merged into the current branch!'
			);
		});

		test('renders fully merged alert when fullyMerged is true and current is true', () => {
			const fullyMergedCurrentBranch = { ...mockBranch, fullyMerged: true, current: true };
			const { queryByText } = render(Branch, {
				props: { data: fullyMergedCurrentBranch, selected: false }
			});
			expect(
				queryByText('This branch is not fully merged into the current branch!')
			).not.toBeInTheDocument();
		});

		test('does not render fully merged alert when fullyMerged is false and current is false', () => {
			const { queryByText } = render(Branch, {
				props: { data: mockBranch, selected: false }
			});
			expect(
				queryByText('This branch is not fully merged into the current branch!')
			).not.toBeInTheDocument();
		});
	});

	describe('Selection State', () => {
		test('applies selected styling when selected prop is true', () => {
			const { getByTestId } = render(Branch, {
				props: { data: mockBranch, selected: true }
			});
			// Check for selected class or styling indicators
			const element = getByTestId(`branch-item-${mockBranch.name}`);
			expect(element.getAttribute('data-selected')).toBe('true');
		});

		test('does not apply selected styling when selected prop is false', () => {
			const { container } = render(Branch, {
				props: { data: mockBranch, selected: false }
			});
			// Check that selected class or styling indicators are not present
			const element = container.firstChild as HTMLElement;
			expect(
				element.classList.contains('selected') || element.getAttribute('data-selected') === 'true'
			).toBeFalsy();
		});
	});
});
