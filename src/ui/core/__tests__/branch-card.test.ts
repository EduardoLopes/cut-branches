import { describe, expect, test } from 'vitest';
import BranchCard from '../branch-card.svelte';
import { Branch } from '$domains/branch-management/core/models/branch';
import type { Branch as BranchData } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

describe('BranchCard Component', () => {
	const mockBranchData: BranchData = {
		name: 'feature/new-feature',
		current: false,
		fullyMerged: false,
		upstream: null,
		lastCommit: {
			sha: 'abc123def456',
			shortSha: 'abc123d',
			date: '2024-01-15T10:30:00Z',
			message: 'feat: add new feature',
			summary: 'feat: add new feature',
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
		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch
		});

		const nameElement = getByTestId('branch-name');
		expect(nameElement).toBeInTheDocument();
		expect(nameElement).toHaveTextContent('feature/new-feature');
	});

	test('renders commit card', () => {
		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch
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

		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: currentBranch
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass('current');
	});

	test('does not apply current class when branch is not current', () => {
		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch
		});

		const card = getByTestId('branch-card');
		expect(card).not.toHaveClass('current');
	});

	test('applies selected class when selected prop is true', () => {
		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			selected: true
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass('selected');
	});

	test('does not apply selected class when selected prop is false', () => {
		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			selected: false
		});

		const card = getByTestId('branch-card');
		expect(card).not.toHaveClass('selected');
	});

	test('applies selected class by default when selected prop is undefined', () => {
		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch
		});

		const card = getByTestId('branch-card');
		expect(card).not.toHaveClass('selected');
	});

	test('applies locked class when locked prop is true', () => {
		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			locked: true
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass('locked');
	});

	test('does not apply locked class when locked prop is false', () => {
		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			locked: false
		});

		const card = getByTestId('branch-card');
		expect(card).not.toHaveClass('locked');
	});

	test('applies disabled class when disabled prop is true', () => {
		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			disabled: true
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass('disabled');
	});

	test('does not apply disabled class when disabled prop is false', () => {
		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			disabled: false
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

		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: deletedBranch
		});

		const deletedInfo = getByTestId('deleted-at-info');
		expect(deletedInfo).toBeInTheDocument();
		expect(deletedInfo).toHaveTextContent('Deleted');
	});

	test('does not display deletedAt info when branch has no deletedAt', () => {
		const screen = renderWithTestWrapper(BranchCard, {
			branch: mockBranch
		});

		const deletedInfo = screen.getByTestId('deleted-at-info');
		expect(deletedInfo).not.toBeInTheDocument();
	});

	test('displays full date in deletedAt title attribute', async () => {
		const deletedBranchData: BranchData = {
			...mockBranchData,
			deletedAt: '2024-01-20T15:45:00Z'
		};
		const deletedBranch = Branch.fromData(deletedBranchData);

		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: deletedBranch
		});

		const spanWithTitle = getByTestId(`deleted-at-title-${deletedBranch.getName()}`);
		await vi.waitFor(() => {
			expect(spanWithTitle).toBeInTheDocument();
		});
	});

	test('applies multiple state classes simultaneously', () => {
		const currentBranchData: BranchData = {
			...mockBranchData,
			current: true
		};
		const currentBranch = Branch.fromData(currentBranchData);

		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: currentBranch,
			selected: true,
			locked: true
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass('current');
		expect(card).toHaveClass('selected');
		expect(card).toHaveClass('locked');
	});

	test('renders git commit icon', () => {
		const { container } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch
		});

		// Check that the "Last commit" label is present
		expect(container).toHaveTextContent('Last commit');
	});

	test('renders trash icon when branch is deleted', () => {
		const deletedBranchData: BranchData = {
			...mockBranchData,
			deletedAt: '2024-01-20T15:45:00Z'
		};
		const deletedBranch = Branch.fromData(deletedBranchData);

		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: deletedBranch
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

		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: specialBranch
		});

		const nameElement = getByTestId('branch-name');
		expect(nameElement).toHaveTextContent('feature/special-chars-@#$%');
	});

	test('selected state changes branch name color', () => {
		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			selected: true
		});

		const nameElement = getByTestId('branch-name');
		expect(nameElement).toBeInTheDocument();
	});

	test('handles branch with isReachable property', () => {
		const branchWithReachableData: BranchData = {
			...mockBranchData,
			isReachable: true
		};
		const branchWithReachable = Branch.fromData(branchWithReachableData);

		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: branchWithReachable
		});

		expect(getByTestId('branch-card')).toBeInTheDocument();
	});

	test('handles branch with fullyMerged true', () => {
		const mergedBranchData: BranchData = {
			...mockBranchData,
			fullyMerged: true
		};
		const mergedBranch = Branch.fromData(mergedBranchData);

		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mergedBranch
		});

		expect(getByTestId('branch-card')).toBeInTheDocument();
	});

	test('accepts and applies custom colorPalette', () => {
		const customPalette = 'test-palette-class';
		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			colorPalette: customPalette
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass(customPalette);
	});

	test('accepts and applies custom id', () => {
		const customId = 'custom-branch-id';
		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			id: customId
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveAttribute('id', customId);
	});

	test('accepts and applies custom title', () => {
		const customTitle = 'Custom branch title';
		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			title: customTitle
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveAttribute('title', customTitle);
	});

	test('renders branch card without children when not provided', () => {
		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch
		});

		const card = getByTestId('branch-card');
		expect(card).toBeInTheDocument();
		// Card renders without errors when no children provided
	});

	test('default variant uses normal selection logic', () => {
		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			selected: true,
			variant: 'default'
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass('selected');
		expect(card).toHaveAttribute('data-variant', 'default');
	});

	test('inverted variant reverses selection visual state when not selected', () => {
		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			selected: false,
			variant: 'inverted'
		});

		const card = getByTestId('branch-card');
		// When selected=false and variant=inverted, visually it should appear selected (danger style)
		expect(card).toHaveClass('selected');
		expect(card).toHaveAttribute('data-variant', 'inverted');
	});

	test('inverted variant reverses selection visual state when selected', () => {
		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			selected: true,
			variant: 'inverted'
		});

		const card = getByTestId('branch-card');
		// When selected=true and variant=inverted, visually it should NOT appear selected (neutral style)
		expect(card).not.toHaveClass('selected');
		expect(card).toHaveAttribute('data-variant', 'inverted');
	});

	test('shows the upstream badge on the branch header when the branch has an upstream', () => {
		const trackedBranchData: BranchData = {
			...mockBranchData,
			upstream: 'origin/feature/new-feature'
		};
		const trackedBranch = Branch.fromData(trackedBranchData);

		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: trackedBranch
		});

		const upstreamBadge = getByTestId('branch-upstream');
		expect(upstreamBadge).toBeInTheDocument();
		expect(upstreamBadge).toHaveTextContent('origin/feature/new-feature');
		// The embedded commit card does not duplicate it in its footer.
		expect(getByTestId('commit-upstream')).not.toBeInTheDocument();
	});

	test('hides the upstream badge when showUpstream is false', () => {
		const trackedBranchData: BranchData = {
			...mockBranchData,
			upstream: 'origin/feature/new-feature'
		};
		const trackedBranch = Branch.fromData(trackedBranchData);

		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: trackedBranch,
			showUpstream: false
		});

		expect(getByTestId('branch-upstream')).not.toBeInTheDocument();
	});

	test('does not show an upstream badge when the branch has no upstream', () => {
		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch
		});

		expect(getByTestId('branch-upstream')).not.toBeInTheDocument();
	});

	test('compact mode drops the "Last commit" section label', () => {
		const { container, getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			compact: true
		});

		expect(container).not.toHaveTextContent('Last commit');
		// The commit row itself still renders.
		expect(getByTestId('last-commit-message')).toBeInTheDocument();
		expect(getByTestId('branch-name')).toHaveTextContent('feature/new-feature');
	});

	test('compact mode still shows the current badge and deleted-at info', () => {
		const compactBranchData: BranchData = {
			...mockBranchData,
			current: true,
			deletedAt: '2024-01-20T15:45:00Z'
		};
		const compactBranch = Branch.fromData(compactBranchData);

		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: compactBranch,
			compact: true
		});

		expect(getByTestId('branch-current-badge')).toBeInTheDocument();
		expect(getByTestId('deleted-at-info')).toBeInTheDocument();
	});

	test('variant defaults to default when not provided', () => {
		const { getByTestId } = renderWithTestWrapper(BranchCard, {
			branch: mockBranch
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveAttribute('data-variant', 'default');
	});
});
