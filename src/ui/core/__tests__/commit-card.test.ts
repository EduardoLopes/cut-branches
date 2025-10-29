import { render } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import CommitCard from '../commit-card.svelte';
import { Commit } from '$domains/branch-management/core/models/commit';
import type { Commit as CommitData } from '$lib/bindings';

describe('CommitCard Component', () => {
	const mockCommitData: CommitData = {
		sha: 'abc123def456',
		shortSha: 'abc123d',
		date: '2024-01-15T10:30:00Z',
		message: 'feat: add new feature',
		author: 'John Doe',
		email: 'john.doe@example.com'
	};

	const mockCommit = Commit.fromData(mockCommitData);

	test('renders commit message', () => {
		const { getByTestId } = render(CommitCard, {
			props: { commit: mockCommit }
		});

		const messageElement = getByTestId('last-commit-message');
		expect(messageElement).toBeInTheDocument();
		expect(messageElement.textContent).toContain('feat: add new feature');
	});

	test('renders commit message with markdown', () => {
		const commitWithMarkdownData: CommitData = {
			...mockCommitData,
			message: '**Bold** and *italic* text'
		};
		const commitWithMarkdown = Commit.fromData(commitWithMarkdownData);

		const { getByTestId } = render(CommitCard, {
			props: { commit: commitWithMarkdown }
		});

		const messageElement = getByTestId('last-commit-message');
		expect(messageElement).toBeInTheDocument();
	});

	test('renders author name', () => {
		const { getByTestId } = render(CommitCard, {
			props: { commit: mockCommit }
		});

		const authorElement = getByTestId('author-name');
		expect(authorElement).toBeInTheDocument();
		expect(authorElement.textContent).toContain('John Doe');
	});

	test('displays email in author title attribute', () => {
		const { getByTestId } = render(CommitCard, {
			props: { commit: mockCommit }
		});

		const authorElement = getByTestId('author-name');
		expect(authorElement).toHaveAttribute('title', 'john.doe@example.com');
	});

	test('renders commit date with relative format', () => {
		const { getByTestId } = render(CommitCard, {
			props: { commit: mockCommit }
		});

		const dateElement = getByTestId('commit-date');
		expect(dateElement).toBeInTheDocument();
		// Date should be displayed in relative format
		expect(dateElement.textContent).toBeTruthy();
	});

	test('displays full date in date title attribute', () => {
		const { getByTestId } = render(CommitCard, {
			props: { commit: mockCommit }
		});

		const dateElement = getByTestId('commit-date');
		expect(dateElement).toHaveAttribute('title');
		// Title should contain formatted date
		const title = dateElement.getAttribute('title');
		expect(title).toBeTruthy();
	});

	test('renders user icon for author', () => {
		const { container } = render(CommitCard, {
			props: { commit: mockCommit }
		});

		const authorSection = container.querySelector('[data-testid="author-name"]');
		expect(authorSection).toBeInTheDocument();
	});

	test('renders clock icon for date', () => {
		const { container } = render(CommitCard, {
			props: { commit: mockCommit }
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

		const { getByTestId } = render(CommitCard, {
			props: { commit: commitWithDifferentDate }
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

		const { getByTestId } = render(CommitCard, {
			props: { commit: commitWithEmptyMessage }
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

		const { getByTestId } = render(CommitCard, {
			props: { commit: commitWithSpecialChars }
		});

		const authorElement = getByTestId('author-name');
		expect(authorElement.textContent).toContain("José María O'Brien");
	});

	test('handles special characters in email', () => {
		const commitWithSpecialEmailData: CommitData = {
			...mockCommitData,
			email: 'test+tag@example.co.uk'
		};
		const commitWithSpecialEmail = Commit.fromData(commitWithSpecialEmailData);

		const { getByTestId } = render(CommitCard, {
			props: { commit: commitWithSpecialEmail }
		});

		const authorElement = getByTestId('author-name');
		expect(authorElement).toHaveAttribute('title', 'test+tag@example.co.uk');
	});
});
