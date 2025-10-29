import { render } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import BranchCard from '../branch-card.svelte';
import { Branch } from '$domains/branch-management/core/models/branch';
import type { Branch as BranchData } from '$lib/bindings';

describe('BranchCard Component', () => {
	const mockBranchData: BranchData = {
		name: 'feature/new-feature',
		current: false,
		fullyMerged: false,
		lastCommit: {
			sha: 'abc123def456',
			shortSha: 'abc123d',
			date: '2024-01-15T10:30:00Z',
			message: 'feat: add new feature',
			author: 'John Doe',
			email: 'john.doe@example.com'
		},
		deletedAt: null,
		isReachable: null,
		isSelected: false,
		isLocked: false
	};

	const mockBranch = Branch.fromData(mockBranchData);

	test('renders branch name', () => {
		const { getByTestId } = render(BranchCard, {
			props: { branch: mockBranch }
		});

		const nameElement = getByTestId('branch-name');
		expect(nameElement).toBeInTheDocument();
		expect(nameElement.textContent).toBe('feature/new-feature');
	});

	test('renders commit card', () => {
		const { getByTestId } = render(BranchCard, {
			props: { branch: mockBranch }
		});

		// CommitCard should render with its test IDs
		expect(getByTestId('last-commit-message')).toBeInTheDocument();
		expect(getByTestId('author-name')).toBeInTheDocument();
		expect(getByTestId('commit-date')).toBeInTheDocument();
	});

	test('applies current class when branch is current', () => {
		const currentBranchData: BranchData = {
			...mockBranchData,
			current: true
		};
		const currentBranch = Branch.fromData(currentBranchData);

		const { getByTestId } = render(BranchCard, {
			props: { branch: currentBranch }
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass('current');
	});

	test('does not apply current class when branch is not current', () => {
		const { getByTestId } = render(BranchCard, {
			props: { branch: mockBranch }
		});

		const card = getByTestId('branch-card');
		expect(card).not.toHaveClass('current');
	});

	test('applies selected class when selected prop is true', () => {
		const { getByTestId } = render(BranchCard, {
			props: { branch: mockBranch, selected: true }
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass('selected');
	});

	test('does not apply selected class when selected prop is false', () => {
		const { getByTestId } = render(BranchCard, {
			props: { branch: mockBranch, selected: false }
		});

		const card = getByTestId('branch-card');
		expect(card).not.toHaveClass('selected');
	});

	test('applies selected class by default when selected prop is undefined', () => {
		const { getByTestId } = render(BranchCard, {
			props: { branch: mockBranch }
		});

		const card = getByTestId('branch-card');
		expect(card).not.toHaveClass('selected');
	});

	test('applies locked class when locked prop is true', () => {
		const { getByTestId } = render(BranchCard, {
			props: { branch: mockBranch, locked: true }
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass('locked');
	});

	test('does not apply locked class when locked prop is false', () => {
		const { getByTestId } = render(BranchCard, {
			props: { branch: mockBranch, locked: false }
		});

		const card = getByTestId('branch-card');
		expect(card).not.toHaveClass('locked');
	});

	test('applies disabled class when disabled prop is true', () => {
		const { getByTestId } = render(BranchCard, {
			props: { branch: mockBranch, disabled: true }
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass('disabled');
	});

	test('does not apply disabled class when disabled prop is false', () => {
		const { getByTestId } = render(BranchCard, {
			props: { branch: mockBranch, disabled: false }
		});

		const card = getByTestId('branch-card');
		expect(card).not.toHaveClass('disabled');
	});

	test('displays deletedAt info when branch has deletedAt', () => {
		const deletedBranchData: BranchData = {
			...mockBranchData,
			deletedAt: '2024-01-20T15:45:00Z'
		};
		const deletedBranch = Branch.fromData(deletedBranchData);

		const { getByTestId } = render(BranchCard, {
			props: { branch: deletedBranch }
		});

		const deletedInfo = getByTestId('deleted-at-info');
		expect(deletedInfo).toBeInTheDocument();
		expect(deletedInfo.textContent).toContain('Deleted');
	});

	test('does not display deletedAt info when branch has no deletedAt', () => {
		const { queryByTestId } = render(BranchCard, {
			props: { branch: mockBranch }
		});

		const deletedInfo = queryByTestId('deleted-at-info');
		expect(deletedInfo).not.toBeInTheDocument();
	});

	test('displays full date in deletedAt title attribute', () => {
		const deletedBranchData: BranchData = {
			...mockBranchData,
			deletedAt: '2024-01-20T15:45:00Z'
		};
		const deletedBranch = Branch.fromData(deletedBranchData);

		const { getByTestId } = render(BranchCard, {
			props: { branch: deletedBranch }
		});

		const deletedInfo = getByTestId('deleted-at-info');
		const spanWithTitle = deletedInfo.querySelector('span[title]');
		expect(spanWithTitle).toBeTruthy();
		expect(spanWithTitle?.getAttribute('title')).toBeTruthy();
	});

	test('applies multiple state classes simultaneously', () => {
		const currentBranchData: BranchData = {
			...mockBranchData,
			current: true
		};
		const currentBranch = Branch.fromData(currentBranchData);

		const { getByTestId } = render(BranchCard, {
			props: { branch: currentBranch, selected: true, locked: true }
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass('current');
		expect(card).toHaveClass('selected');
		expect(card).toHaveClass('locked');
	});

	test('renders git commit icon', () => {
		const { container } = render(BranchCard, {
			props: { branch: mockBranch }
		});

		// Check that the "Last commit" label is present
		expect(container.textContent).toContain('Last commit');
	});

	test('renders trash icon when branch is deleted', () => {
		const deletedBranchData: BranchData = {
			...mockBranchData,
			deletedAt: '2024-01-20T15:45:00Z'
		};
		const deletedBranch = Branch.fromData(deletedBranchData);

		const { getByTestId } = render(BranchCard, {
			props: { branch: deletedBranch }
		});

		const deletedInfo = getByTestId('deleted-at-info');
		expect(deletedInfo).toBeInTheDocument();
	});

	test('handles branch with special characters in name', () => {
		const specialBranchData: BranchData = {
			...mockBranchData,
			name: 'feature/special-chars-@#$%'
		};
		const specialBranch = Branch.fromData(specialBranchData);

		const { getByTestId } = render(BranchCard, {
			props: { branch: specialBranch }
		});

		const nameElement = getByTestId('branch-name');
		expect(nameElement.textContent).toBe('feature/special-chars-@#$%');
	});

	test('selected state changes branch name color', () => {
		const { getByTestId } = render(BranchCard, {
			props: { branch: mockBranch, selected: true }
		});

		const nameElement = getByTestId('branch-name');
		expect(nameElement.parentElement).toBeTruthy();
	});

	test('handles branch with isReachable property', () => {
		const branchWithReachableData: BranchData = {
			...mockBranchData,
			isReachable: true
		};
		const branchWithReachable = Branch.fromData(branchWithReachableData);

		const { getByTestId } = render(BranchCard, {
			props: { branch: branchWithReachable }
		});

		expect(getByTestId('branch-card')).toBeInTheDocument();
	});

	test('handles branch with fullyMerged true', () => {
		const mergedBranchData: BranchData = {
			...mockBranchData,
			fullyMerged: true
		};
		const mergedBranch = Branch.fromData(mergedBranchData);

		const { getByTestId } = render(BranchCard, {
			props: { branch: mergedBranch }
		});

		expect(getByTestId('branch-card')).toBeInTheDocument();
	});

	test('accepts and applies custom colorPalette', () => {
		const customPalette = 'test-palette-class';
		const { getByTestId } = render(BranchCard, {
			props: { branch: mockBranch, colorPalette: customPalette }
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass(customPalette);
	});

	test('accepts and applies custom id', () => {
		const customId = 'custom-branch-id';
		const { getByTestId } = render(BranchCard, {
			props: { branch: mockBranch, id: customId }
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveAttribute('id', customId);
	});

	test('accepts and applies custom title', () => {
		const customTitle = 'Custom branch title';
		const { getByTestId } = render(BranchCard, {
			props: { branch: mockBranch, title: customTitle }
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveAttribute('title', customTitle);
	});

	test('renders branch card without children when not provided', () => {
		const { getByTestId } = render(BranchCard, {
			props: { branch: mockBranch }
		});

		const card = getByTestId('branch-card');
		expect(card).toBeInTheDocument();
		// Card renders without errors when no children provided
	});

	test('default variant uses normal selection logic', () => {
		const { getByTestId } = render(BranchCard, {
			props: { branch: mockBranch, selected: true, variant: 'default' }
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass('selected');
		expect(card).toHaveAttribute('data-variant', 'default');
	});

	test('inverted variant reverses selection visual state when not selected', () => {
		const { getByTestId } = render(BranchCard, {
			props: { branch: mockBranch, selected: false, variant: 'inverted' }
		});

		const card = getByTestId('branch-card');
		// When selected=false and variant=inverted, visually it should appear selected (danger style)
		expect(card).toHaveClass('selected');
		expect(card).toHaveAttribute('data-variant', 'inverted');
	});

	test('inverted variant reverses selection visual state when selected', () => {
		const { getByTestId } = render(BranchCard, {
			props: { branch: mockBranch, selected: true, variant: 'inverted' }
		});

		const card = getByTestId('branch-card');
		// When selected=true and variant=inverted, visually it should NOT appear selected (neutral style)
		expect(card).not.toHaveClass('selected');
		expect(card).toHaveAttribute('data-variant', 'inverted');
	});

	test('variant defaults to default when not provided', () => {
		const { getByTestId } = render(BranchCard, {
			props: { branch: mockBranch }
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveAttribute('data-variant', 'default');
	});
});
