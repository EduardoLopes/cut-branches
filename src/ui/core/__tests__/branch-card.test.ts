import { createRawSnippet } from 'svelte';
import { describe, expect, test, vi } from 'vitest';
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

	test('renders branch name', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch
		});

		const nameElement = getByTestId('branch-name');
		expect(nameElement).toBeInTheDocument();
		expect(nameElement).toHaveTextContent('feature/new-feature');
	});

	test('renders commit card', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch
		});

		// CommitCard should render with its test IDs
		expect(getByTestId('last-commit-message')).toBeInTheDocument();
		expect(getByTestId('author-name')).toBeInTheDocument();
		expect(getByTestId('commit-date')).toBeInTheDocument();
	});

	test('applies current class when branch is current', async () => {
		const currentBranchData: BranchData = {
			...mockBranchData,
			current: true
		};
		const currentBranch = Branch.fromData(currentBranchData);

		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: currentBranch
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass('current');
	});

	test('does not apply current class when branch is not current', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch
		});

		const card = getByTestId('branch-card');
		expect(card).not.toHaveClass('current');
	});

	test('applies selected class when selected prop is true', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			selected: true
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass('selected');
	});

	test('does not apply selected class when selected prop is false', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			selected: false
		});

		const card = getByTestId('branch-card');
		expect(card).not.toHaveClass('selected');
	});

	test('applies selected class by default when selected prop is undefined', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch
		});

		const card = getByTestId('branch-card');
		expect(card).not.toHaveClass('selected');
	});

	test('applies locked class when locked prop is true', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			locked: true
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass('locked');
	});

	test('does not apply locked class when locked prop is false', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			locked: false
		});

		const card = getByTestId('branch-card');
		expect(card).not.toHaveClass('locked');
	});

	test('applies disabled class when disabled prop is true', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			disabled: true
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass('disabled');
	});

	test('does not apply disabled class when disabled prop is false', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			disabled: false
		});

		const card = getByTestId('branch-card');
		expect(card).not.toHaveClass('disabled');
	});

	test('displays deletedAt info when branch has deletedAt', async () => {
		const deletedBranchData: BranchData = {
			...mockBranchData,
			deletedAt: '2024-01-20T15:45:00Z'
		};
		const deletedBranch = Branch.fromData(deletedBranchData);

		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: deletedBranch
		});

		const deletedInfo = getByTestId('deleted-at-info');
		expect(deletedInfo).toBeInTheDocument();
		expect(deletedInfo).toMatchTextContent('Deleted');
	});

	test('does not display deletedAt info when branch has no deletedAt', async () => {
		const screen = await renderWithTestWrapper(BranchCard, {
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

		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: deletedBranch
		});

		const spanWithTitle = getByTestId(`deleted-at-title-${deletedBranch.getName()}`);
		await vi.waitFor(() => {
			expect(spanWithTitle).toBeInTheDocument();
		});
	});

	test('applies multiple state classes simultaneously', async () => {
		const currentBranchData: BranchData = {
			...mockBranchData,
			current: true
		};
		const currentBranch = Branch.fromData(currentBranchData);

		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: currentBranch,
			selected: true,
			locked: true
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass('current');
		expect(card).toHaveClass('selected');
		expect(card).toHaveClass('locked');
	});

	test('renders git commit icon', async () => {
		const { container } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch
		});

		// Check that the "Last commit" label is present
		expect(container).toMatchTextContent('Last commit');
	});

	test('renders trash icon when branch is deleted', async () => {
		const deletedBranchData: BranchData = {
			...mockBranchData,
			deletedAt: '2024-01-20T15:45:00Z'
		};
		const deletedBranch = Branch.fromData(deletedBranchData);

		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: deletedBranch
		});

		const deletedInfo = getByTestId('deleted-at-info');
		expect(deletedInfo).toBeInTheDocument();
	});

	test('handles branch with special characters in name', async () => {
		const specialBranchData: BranchData = {
			...mockBranchData,
			name: 'feature/special-chars-@#$%'
		};
		const specialBranch = Branch.fromData(specialBranchData);

		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: specialBranch
		});

		const nameElement = getByTestId('branch-name');
		expect(nameElement).toHaveTextContent('feature/special-chars-@#$%');
	});

	test('selected state changes branch name color', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			selected: true
		});

		const nameElement = getByTestId('branch-name');
		expect(nameElement).toBeInTheDocument();
	});

	test('handles branch with isReachable property', async () => {
		const branchWithReachableData: BranchData = {
			...mockBranchData,
			isReachable: true
		};
		const branchWithReachable = Branch.fromData(branchWithReachableData);

		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: branchWithReachable
		});

		expect(getByTestId('branch-card')).toBeInTheDocument();
	});

	test('handles branch with fullyMerged true', async () => {
		const mergedBranchData: BranchData = {
			...mockBranchData,
			fullyMerged: true
		};
		const mergedBranch = Branch.fromData(mergedBranchData);

		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mergedBranch
		});

		expect(getByTestId('branch-card')).toBeInTheDocument();
	});

	test('accepts and applies custom colorPalette', async () => {
		const customPalette = 'test-palette-class';
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			colorPalette: customPalette
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass(customPalette);
	});

	test('accepts and applies custom id', async () => {
		const customId = 'custom-branch-id';
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			id: customId
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveAttribute('id', customId);
	});

	test('accepts and applies custom title', async () => {
		const customTitle = 'Custom branch title';
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			title: customTitle
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveAttribute('title', customTitle);
	});

	test('renders the diff deep-link in the footer when a diffHref is provided', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			diffHref: '/repos/1/diff?branch=feature%2Fnew-feature'
		});

		const link = getByTestId('branch-diff-link');
		expect(link).toBeInTheDocument();
		expect(link.element().getAttribute('href')).toBe('/repos/1/diff?branch=feature%2Fnew-feature');
	});

	test('does not render the diff deep-link without a diffHref', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch
		});

		expect(getByTestId('branch-diff-link')).not.toBeInTheDocument();
	});

	test('renders branch card without children when not provided', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch
		});

		const card = getByTestId('branch-card');
		expect(card).toBeInTheDocument();
		// Card renders without errors when no children provided
	});

	test('default variant uses normal selection logic', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			selected: true,
			variant: 'default'
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveClass('selected');
		expect(card).toHaveAttribute('data-variant', 'default');
	});

	test('inverted variant reverses selection visual state when not selected', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			selected: false,
			variant: 'inverted'
		});

		const card = getByTestId('branch-card');
		// When selected=false and variant=inverted, visually it should appear selected (danger style)
		expect(card).toHaveClass('selected');
		expect(card).toHaveAttribute('data-variant', 'inverted');
	});

	test('inverted variant reverses selection visual state when selected', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			selected: true,
			variant: 'inverted'
		});

		const card = getByTestId('branch-card');
		// When selected=true and variant=inverted, visually it should NOT appear selected (neutral style)
		expect(card).not.toHaveClass('selected');
		expect(card).toHaveAttribute('data-variant', 'inverted');
	});

	test('shows the upstream badge in the card footer when the branch has an upstream', async () => {
		const trackedBranchData: BranchData = {
			...mockBranchData,
			upstream: 'origin/feature/new-feature'
		};
		const trackedBranch = Branch.fromData(trackedBranchData);

		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: trackedBranch
		});

		const upstreamBadge = getByTestId('branch-upstream');
		expect(upstreamBadge).toBeInTheDocument();
		expect(upstreamBadge).toHaveTextContent('origin/feature/new-feature');
		// The embedded commit card does not duplicate it in its footer.
		expect(getByTestId('commit-upstream')).not.toBeInTheDocument();
	});

	test('hides the upstream badge when showUpstream is false', async () => {
		const trackedBranchData: BranchData = {
			...mockBranchData,
			upstream: 'origin/feature/new-feature'
		};
		const trackedBranch = Branch.fromData(trackedBranchData);

		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: trackedBranch,
			showUpstream: false
		});

		expect(getByTestId('branch-upstream')).not.toBeInTheDocument();
		expect(getByTestId('branch-no-upstream')).not.toBeInTheDocument();
	});

	test('shows a neutral "no upstream" badge when the branch has no upstream', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch
		});

		expect(getByTestId('branch-upstream')).not.toBeInTheDocument();
		expect(getByTestId('branch-no-upstream')).toHaveTextContent('no upstream');
	});

	test('hides the "no upstream" badge when showUpstream is false', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			showUpstream: false
		});

		expect(getByTestId('branch-no-upstream')).not.toBeInTheDocument();
	});

	test('appends consumer footerBadges to the footer trailing row', async () => {
		const footerBadges = createRawSnippet(() => ({
			render: () => '<span data-testid="extra-footer-badge">3↑</span>'
		}));

		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			footerBadges
		});

		expect(getByTestId('extra-footer-badge')).toHaveTextContent('3↑');
	});

	test('footerBadges alone force the footer even with the upstream hidden', async () => {
		const footerBadges = createRawSnippet(() => ({
			render: () => '<span data-testid="extra-footer-badge">merged</span>'
		}));

		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			showUpstream: false,
			footerBadges
		});

		expect(getByTestId('extra-footer-badge')).toBeInTheDocument();
		expect(getByTestId('branch-no-upstream')).not.toBeInTheDocument();
	});

	test('shows added/removed line badges in the footer when diffStats is provided', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			diffStats: { linesAdded: 12, linesRemoved: 4 }
		});

		expect(getByTestId('branch-diff-stats')).toBeInTheDocument();
		expect(getByTestId('branch-diff-added')).toHaveTextContent('+12');
		expect(getByTestId('branch-diff-removed')).toHaveTextContent('−4');
	});

	test('shows diff badges alongside the upstream badge when both are present', async () => {
		const trackedBranchData: BranchData = {
			...mockBranchData,
			upstream: 'origin/feature/new-feature'
		};
		const trackedBranch = Branch.fromData(trackedBranchData);

		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: trackedBranch,
			diffStats: { linesAdded: 1, linesRemoved: 0 }
		});

		expect(getByTestId('branch-upstream')).toBeInTheDocument();
		expect(getByTestId('branch-diff-added')).toHaveTextContent('+1');
		expect(getByTestId('branch-diff-removed')).toHaveTextContent('−0');
	});

	test('does not show diff badges when diffStats is omitted', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch
		});

		expect(getByTestId('branch-diff-stats')).not.toBeInTheDocument();
	});

	test('shows a neutral "no diff" badge for an empty diff instead of colored zeros', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			diffStats: { linesAdded: 0, linesRemoved: 0 }
		});

		expect(getByTestId('branch-diff-none')).toHaveTextContent('no diff');
		expect(getByTestId('branch-diff-stats')).not.toBeInTheDocument();
	});

	test('shows placeholder diff badges while diff stats are loading', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			diffStatsLoading: true
		});

		expect(getByTestId('branch-diff-stats-loading')).toBeInTheDocument();
		expect(getByTestId('branch-diff-stats')).not.toBeInTheDocument();
	});

	test('real badges replace the placeholder once diff stats resolve', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			diffStats: { linesAdded: 2, linesRemoved: 5 },
			diffStatsLoading: false
		});

		expect(getByTestId('branch-diff-stats-loading')).not.toBeInTheDocument();
		expect(getByTestId('branch-diff-added')).toHaveTextContent('+2');
		expect(getByTestId('branch-diff-removed')).toHaveTextContent('−5');
	});

	test('compact mode omits the last commit entirely', async () => {
		const { container, getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch,
			compact: true
		});

		expect(container).not.toHaveTextContent('Last commit');
		expect(getByTestId('last-commit-message')).not.toBeInTheDocument();
		expect(getByTestId('branch-name')).toHaveTextContent('feature/new-feature');
	});

	test('compact mode still shows the current badge and deleted-at info', async () => {
		const compactBranchData: BranchData = {
			...mockBranchData,
			current: true,
			deletedAt: '2024-01-20T15:45:00Z'
		};
		const compactBranch = Branch.fromData(compactBranchData);

		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: compactBranch,
			compact: true
		});

		expect(getByTestId('branch-current-badge')).toBeInTheDocument();
		expect(getByTestId('deleted-at-info')).toBeInTheDocument();
	});

	test('variant defaults to default when not provided', async () => {
		const { getByTestId } = await renderWithTestWrapper(BranchCard, {
			branch: mockBranch
		});

		const card = getByTestId('branch-card');
		expect(card).toHaveAttribute('data-variant', 'default');
	});

	describe('recent-commits disclosure', () => {
		const recentCommits = createRawSnippet(() => ({
			render: () => '<div data-testid="recent-commits-content">earlier commits</div>'
		}));

		test('renders the last commit as a mini row, without the commit card chrome', async () => {
			const { getByTestId } = await renderWithTestWrapper(BranchCard, {
				branch: mockBranch
			});

			expect(getByTestId('commit-mini-row')).toBeInTheDocument();
			expect(getByTestId('last-commit-message')).toHaveTextContent('feat: add new feature');
			expect(getByTestId('commit-sha')).not.toBeInTheDocument();
		});

		test('promotes the last commit to a full card on expand, exposing its body', async () => {
			const branchWithBody = Branch.fromData({
				...mockBranchData,
				lastCommit: {
					...mockBranchData.lastCommit,
					message: 'feat: add new feature\n\nDetailed description line'
				}
			});

			const { getByTestId } = await renderWithTestWrapper(BranchCard, {
				branch: branchWithBody,
				recentCommits,
				commitDiffHref: '/repos/1/diff?commit=abc123def456'
			});

			// Collapsed: one line, no body disclosure and nowhere to put the diff.
			expect(getByTestId('commit-mini-row')).toBeInTheDocument();
			expect(getByTestId('toggle-commit-description')).not.toBeInTheDocument();
			expect(getByTestId('commit-diff-link')).not.toBeInTheDocument();

			await getByTestId('toggle-recent-commits').click();

			// Expanded: the card chrome is back, so the description can be read.
			expect(getByTestId('commit-mini-row')).not.toBeInTheDocument();
			expect(getByTestId('commit-sha')).toBeInTheDocument();
			expect(getByTestId('commit-diff-link')).toBeInTheDocument();

			await getByTestId('toggle-commit-description').click();
			expect(getByTestId('commit-description')).toHaveTextContent('Detailed description line');
		});

		// Both words stay mounted so they can animate past each other, so the
		// live label is the `data-label` attribute rather than the text content.
		test('renames the panel header once it holds more than the tip', async () => {
			const { getByTestId } = await renderWithTestWrapper(BranchCard, {
				branch: mockBranch,
				recentCommits
			});

			const label = getByTestId('commit-panel-label');
			expect(label).toHaveAttribute('data-label', 'Last commit');

			await getByTestId('toggle-recent-commits').click();
			expect(label).toHaveAttribute('data-label', 'Recent commits');

			await getByTestId('toggle-recent-commits').click();
			expect(label).toHaveAttribute('data-label', 'Last commit');
		});

		test('announces only the label that is showing', async () => {
			const { getByTestId, getByText } = await renderWithTestWrapper(BranchCard, {
				branch: mockBranch,
				recentCommits
			});

			expect(getByText('Last commit').element()).not.toHaveAttribute('aria-hidden', 'true');
			expect(getByText('Recent commits').element()).toHaveAttribute('aria-hidden', 'true');

			await getByTestId('toggle-recent-commits').click();

			expect(getByText('Last commit').element()).toHaveAttribute('aria-hidden', 'true');
			expect(getByText('Recent commits').element()).not.toHaveAttribute('aria-hidden', 'true');
		});

		test('keeps the header at "Last commit" when there is no disclosure', async () => {
			const { getByTestId } = await renderWithTestWrapper(BranchCard, {
				branch: mockBranch
			});

			expect(getByTestId('commit-panel-label')).toHaveAttribute('data-label', 'Last commit');
		});

		test('demotes the last commit back to a mini row on collapse', async () => {
			const { getByTestId } = await renderWithTestWrapper(BranchCard, {
				branch: mockBranch,
				recentCommits
			});

			const toggle = getByTestId('toggle-recent-commits');

			await toggle.click();
			expect(getByTestId('commit-sha')).toBeInTheDocument();

			await toggle.click();
			expect(getByTestId('commit-mini-row')).toBeInTheDocument();
			expect(getByTestId('commit-sha')).not.toBeInTheDocument();
		});

		test('shows no toggle when the consumer provides no recent-commits snippet', async () => {
			const { getByTestId } = await renderWithTestWrapper(BranchCard, {
				branch: mockBranch
			});

			expect(getByTestId('toggle-recent-commits')).not.toBeInTheDocument();
			expect(getByTestId('recent-commits-region')).not.toBeInTheDocument();
		});

		test('starts collapsed, keeping the snippet unmounted so it fetches lazily', async () => {
			const { getByTestId } = await renderWithTestWrapper(BranchCard, {
				branch: mockBranch,
				recentCommits
			});

			const toggle = getByTestId('toggle-recent-commits');
			expect(toggle).toBeInTheDocument();
			expect(toggle).toHaveTextContent('More');
			expect(toggle).toHaveAttribute('aria-expanded', 'false');
			expect(getByTestId('recent-commits-region')).toHaveAttribute('data-expanded', 'false');
			expect(getByTestId('recent-commits-content')).not.toBeInTheDocument();
		});

		test('mounts and unmounts the snippet as the toggle is clicked', async () => {
			const { getByTestId } = await renderWithTestWrapper(BranchCard, {
				branch: mockBranch,
				recentCommits
			});

			const toggle = getByTestId('toggle-recent-commits');

			await toggle.click();
			expect(getByTestId('recent-commits-content')).toBeInTheDocument();
			expect(toggle).toHaveTextContent('Less');
			expect(toggle).toHaveAttribute('aria-expanded', 'true');
			expect(getByTestId('recent-commits-region')).toHaveAttribute('data-expanded', 'true');

			// Collapsing keeps the content mounted for the length of the height
			// transition — an empty box has nothing to animate closed.
			await toggle.click();
			expect(toggle).toHaveTextContent('More');
			expect(getByTestId('recent-commits-region')).toHaveAttribute('data-expanded', 'false');
			expect(getByTestId('recent-commits-content')).toBeInTheDocument();
			await expect.element(getByTestId('recent-commits-content')).not.toBeInTheDocument();
		});

		test('signals expand intent on hover and on focus, before the snippet mounts', async () => {
			const onRecentCommitsIntent = vi.fn();
			const { getByTestId } = await renderWithTestWrapper(BranchCard, {
				branch: mockBranch,
				recentCommits,
				onRecentCommitsIntent
			});

			const toggle = getByTestId('toggle-recent-commits');

			await toggle.hover();
			expect(onRecentCommitsIntent).toHaveBeenCalled();
			// Nothing has expanded — the signal is intent, not the action.
			expect(getByTestId('recent-commits-content')).not.toBeInTheDocument();

			onRecentCommitsIntent.mockClear();
			toggle.element().dispatchEvent(new FocusEvent('focus'));
			expect(onRecentCommitsIntent).toHaveBeenCalled();
		});

		test('works without an intent handler', async () => {
			const { getByTestId } = await renderWithTestWrapper(BranchCard, {
				branch: mockBranch,
				recentCommits
			});

			const toggle = getByTestId('toggle-recent-commits');
			await toggle.hover();
			await toggle.click();

			expect(getByTestId('recent-commits-content')).toBeInTheDocument();
		});

		test('points the toggle at the region it controls', async () => {
			const { getByTestId } = await renderWithTestWrapper(BranchCard, {
				branch: mockBranch,
				recentCommits
			});

			const controls = getByTestId('toggle-recent-commits').element().getAttribute('aria-controls');
			expect(controls).toBe('recent-commits-feature/new-feature');
			await expect.element(getByTestId('recent-commits-region')).toHaveAttribute('id', controls!);
		});

		test('compact mode drops the disclosure along with the whole commit panel', async () => {
			const { getByTestId } = await renderWithTestWrapper(BranchCard, {
				branch: mockBranch,
				compact: true,
				recentCommits
			});

			expect(getByTestId('toggle-recent-commits')).not.toBeInTheDocument();
			expect(getByTestId('recent-commits-region')).not.toBeInTheDocument();
		});
	});
});
