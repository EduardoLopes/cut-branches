import { createRawSnippet } from 'svelte';
import { describe, expect, test } from 'vitest';
import CommitCard from '../commit-card.svelte';
import { Commit } from '$domains/branch-management/core/models/commit';
import type { Commit as CommitData } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

describe('CommitCard Component', () => {
	const mockCommitData: CommitData = {
		sha: 'abc123def456',
		shortSha: 'abc123d',
		date: '2024-01-15T10:30:00Z',
		message: 'feat: add new feature',
		summary: 'feat: add new feature',
		author: 'John Doe',
		email: 'john.doe@example.com'
	};

	const mockCommit = Commit.fromData(mockCommitData);

	test('renders the short SHA in the footer with the full SHA as its title', () => {
		const { getByTestId, container } = renderWithTestWrapper(CommitCard, {
			commit: mockCommit
		});

		const shaElement = getByTestId('commit-sha');
		expect(shaElement.element().textContent).toContain('abc123d');
		// The full SHA is disclosed on hover via the title attribute on the inner span.
		const titled = container.querySelector('[data-testid="commit-sha"] [title]');
		expect(titled?.getAttribute('title')).toBe('abc123def456');
	});

	test('renders the upstream ref badge when an upstream is provided', () => {
		const { getByTestId } = renderWithTestWrapper(CommitCard, {
			commit: mockCommit,
			upstream: 'origin/main'
		});

		const upstreamElement = getByTestId('commit-upstream');
		expect(upstreamElement).toBeInTheDocument();
		expect(upstreamElement.element().textContent).toContain('origin/main');
	});

	test('does not render an upstream badge when no upstream is provided', () => {
		const { getByTestId } = renderWithTestWrapper(CommitCard, {
			commit: mockCommit
		});

		expect(getByTestId('commit-upstream')).not.toBeInTheDocument();
	});

	test('renders the history deep-link when a historyHref is provided', () => {
		const { getByTestId } = renderWithTestWrapper(CommitCard, {
			commit: mockCommit,
			historyHref: '/repos/1/commits/abc123def456'
		});

		const link = getByTestId('commit-history-link');
		expect(link).toBeInTheDocument();
		expect(link.element().getAttribute('href')).toBe('/repos/1/commits/abc123def456');
	});

	test('does not render the history deep-link without a historyHref', () => {
		const { getByTestId } = renderWithTestWrapper(CommitCard, {
			commit: mockCommit
		});

		expect(getByTestId('commit-history-link')).not.toBeInTheDocument();
	});

	test('mounts the hover-preview popover when both hoverPreview and historyHref are provided', () => {
		const hoverPreview = createRawSnippet(() => ({
			render: () => '<div data-testid="hover-preview">preview</div>'
		}));

		const { getByTestId } = renderWithTestWrapper(CommitCard, {
			commit: mockCommit,
			historyHref: '/repos/1/commits/abc123def456',
			hoverPreview
		});

		// The trigger link (popover anchor) renders; the popover itself opens on hover.
		expect(getByTestId('commit-history-link')).toBeInTheDocument();
	});

	test('renders commit message', () => {
		const { getByTestId } = renderWithTestWrapper(CommitCard, {
			commit: mockCommit
		});

		const messageElement = getByTestId('last-commit-message');
		expect(messageElement).toBeInTheDocument();
		expect(messageElement.element().textContent).toContain('feat: add new feature');
	});

	test('renders commit message with markdown', () => {
		const commitWithMarkdownData: CommitData = {
			...mockCommitData,
			message: '**Bold** and *italic* text'
		};
		const commitWithMarkdown = Commit.fromData(commitWithMarkdownData);

		const { getByTestId } = renderWithTestWrapper(CommitCard, {
			commit: commitWithMarkdown
		});

		const messageElement = getByTestId('last-commit-message');
		expect(messageElement).toBeInTheDocument();
	});

	test('renders only the subject line in the message when the commit has a body', () => {
		const commitWithBodyData: CommitData = {
			...mockCommitData,
			message: 'feat: add new feature\n\nDetailed description line'
		};
		const commitWithBody = Commit.fromData(commitWithBodyData);

		const { getByTestId } = renderWithTestWrapper(CommitCard, {
			commit: commitWithBody
		});

		const messageElement = getByTestId('last-commit-message');
		expect(messageElement.element().textContent).toContain('feat: add new feature');
		expect(messageElement.element().textContent).not.toContain('Detailed description line');
	});

	test('keeps the description body collapsed by default, exposing a toggle', () => {
		const commitWithBodyData: CommitData = {
			...mockCommitData,
			message: 'feat: add new feature\n\nDetailed description line'
		};
		const commitWithBody = Commit.fromData(commitWithBodyData);

		const { getByTestId } = renderWithTestWrapper(CommitCard, {
			commit: commitWithBody
		});

		// Body hidden initially; the disclosure toggle is present.
		expect(getByTestId('commit-description')).not.toBeInTheDocument();
		expect(getByTestId('toggle-commit-description')).toBeInTheDocument();
	});

	test('reveals and hides the description body when the toggle is clicked', async () => {
		const commitWithBodyData: CommitData = {
			...mockCommitData,
			message: 'feat: add new feature\n\nDetailed description line'
		};
		const commitWithBody = Commit.fromData(commitWithBodyData);

		const { getByTestId } = renderWithTestWrapper(CommitCard, {
			commit: commitWithBody
		});

		const toggle = getByTestId('toggle-commit-description');

		// Expand: the body appears with its content.
		await toggle.click();
		const descriptionElement = getByTestId('commit-description');
		expect(descriptionElement).toBeInTheDocument();
		expect(descriptionElement.element().textContent).toContain('Detailed description line');

		// Collapse again: the body is removed.
		await toggle.click();
		expect(getByTestId('commit-description')).not.toBeInTheDocument();
	});

	test('does not render a description or toggle when the commit message is a single line', () => {
		const { getByTestId } = renderWithTestWrapper(CommitCard, {
			commit: mockCommit
		});

		expect(getByTestId('commit-description')).not.toBeInTheDocument();
		expect(getByTestId('toggle-commit-description')).not.toBeInTheDocument();
	});

	test('renders author name', () => {
		const { getByTestId } = renderWithTestWrapper(CommitCard, {
			commit: mockCommit
		});

		const authorElement = getByTestId('author-name');
		expect(authorElement).toBeInTheDocument();
		expect(authorElement.element().textContent).toContain('John Doe');
	});

	test('displays email in author title attribute', async () => {
		const { getByTestId } = renderWithTestWrapper(CommitCard, {
			commit: mockCommit
		});

		const authorElement = getByTestId('author-name');
		await expect.element(authorElement).toHaveAttribute('title', 'john.doe@example.com');
	});

	test('renders commit date with relative format', () => {
		const { getByTestId } = renderWithTestWrapper(CommitCard, {
			commit: mockCommit
		});

		const dateElement = getByTestId('commit-date');
		expect(dateElement).toBeInTheDocument();
		// Date should be displayed in relative format
		expect(dateElement.element().textContent).toBeTruthy();
	});

	test('displays full date in date title attribute', async () => {
		const { getByTestId } = renderWithTestWrapper(CommitCard, {
			commit: mockCommit
		});

		const dateElement = getByTestId('commit-date');
		await expect.element(dateElement).toHaveAttribute('title');
		// Title should contain formatted date
		const title = dateElement.element().getAttribute('title');
		expect(title).toBeTruthy();
	});

	test('renders user icon for author', () => {
		const { container } = renderWithTestWrapper(CommitCard, {
			commit: mockCommit
		});

		const authorSection = container.querySelector('[data-testid="author-name"]');
		expect(authorSection).toBeInTheDocument();
	});

	test('renders clock icon for date', () => {
		const { container } = renderWithTestWrapper(CommitCard, {
			commit: mockCommit
		});

		const dateSection = container.querySelector('[data-testid="commit-date"]');
		expect(dateSection).toBeInTheDocument();
	});

	test('handles different date formats', () => {
		const commitWithDifferentDateData: CommitData = {
			...mockCommitData,
			date: '2023-12-01T00:00:00Z'
		};
		const commitWithDifferentDate = Commit.fromData(commitWithDifferentDateData);

		const { getByTestId } = renderWithTestWrapper(CommitCard, {
			commit: commitWithDifferentDate
		});

		const dateElement = getByTestId('commit-date');
		expect(dateElement).toBeInTheDocument();
	});

	test('handles empty commit message', () => {
		const commitWithEmptyMessageData: CommitData = {
			...mockCommitData,
			message: ''
		};
		const commitWithEmptyMessage = Commit.fromData(commitWithEmptyMessageData);

		const { getByTestId } = renderWithTestWrapper(CommitCard, {
			commit: commitWithEmptyMessage
		});

		const messageElement = getByTestId('last-commit-message');
		expect(messageElement).toBeInTheDocument();
	});

	test('handles special characters in author name', () => {
		const commitWithSpecialCharsData: CommitData = {
			...mockCommitData,
			author: "José María O'Brien"
		};
		const commitWithSpecialChars = Commit.fromData(commitWithSpecialCharsData);

		const { getByTestId } = renderWithTestWrapper(CommitCard, {
			commit: commitWithSpecialChars
		});

		const authorElement = getByTestId('author-name');
		expect(authorElement.element().textContent).toContain("José María O'Brien");
	});

	test('handles special characters in email', async () => {
		const commitWithSpecialEmailData: CommitData = {
			...mockCommitData,
			email: 'test+tag@example.co.uk'
		};
		const commitWithSpecialEmail = Commit.fromData(commitWithSpecialEmailData);

		const { getByTestId } = renderWithTestWrapper(CommitCard, {
			commit: commitWithSpecialEmail
		});

		const authorElement = getByTestId('author-name');
		await expect.element(authorElement).toHaveAttribute('title', 'test+tag@example.co.uk');
	});
});
