import { CommitSha } from '$core/commit-sha';
import { Email } from '$core/email';
import type { Commit as CommitData } from '$infrastructure/bindings';

/**
 * Commit Domain Model
 *
 * Represents an immutable git commit with rich behavior.
 * Provides methods for formatting, querying, and comparing commits.
 */

export class Commit {
	private readonly sha: CommitSha;
	private readonly date: Date;
	private readonly message: string;
	private readonly summary: string;
	private readonly author: string;
	private readonly email: Email;

	/**
	 * Private constructor - use static factory methods to create instances
	 */
	private constructor(
		sha: CommitSha,
		date: Date,
		message: string,
		summary: string,
		author: string,
		email: Email
	) {
		this.sha = sha;
		this.date = date;
		this.message = message;
		this.summary = summary;
		this.author = author;
		this.email = email;
	}

	/**
	 * Creates a Commit from data transfer object
	 * @param data - The commit data from Tauri backend
	 * @returns A new Commit instance
	 */
	static fromData(data: CommitData): Commit {
		return new Commit(
			new CommitSha(data.sha),
			new Date(data.date),
			data.message,
			data.summary,
			data.author,
			new Email(data.email)
		);
	}

	/**
	 * Converts this Commit back to a data transfer object
	 * @returns CommitData object
	 */
	toData(): CommitData {
		return {
			sha: this.sha.getValue(),
			shortSha: this.sha.getShortSha(),
			date: this.date.toISOString(),
			message: this.message,
			summary: this.summary,
			author: this.author,
			email: this.email.getValue()
		};
	}

	/**
	 * Gets the full commit SHA
	 * @returns The commit SHA value
	 */
	getSha(): string {
		return this.sha.getValue();
	}

	/**
	 * Gets the short version of the commit SHA
	 * @param length - Optional custom length (default: 7)
	 * @returns Short SHA string
	 */
	getShortSha(length?: number): string {
		return this.sha.getShortSha(length);
	}

	/**
	 * Gets the commit date
	 * @returns The commit date
	 */
	getDate(): Date {
		return this.date;
	}

	/**
	 * Gets the commit message
	 * @returns The commit message
	 */
	getMessage(): string {
		return this.message;
	}

	/**
	 * Gets the commit summary — the first line (subject) of the message, as
	 * provided by the backend.
	 * @returns The commit subject line
	 */
	getSummary(): string {
		return this.summary;
	}

	/**
	 * Gets a shortened version of the commit message
	 * @param maxLength - Maximum length of the message (default: 50)
	 * @returns Truncated message with ellipsis if needed
	 */
	getShortMessage(maxLength: number = 50): string {
		if (this.message.length <= maxLength) {
			return this.message;
		}
		return this.message.substring(0, maxLength - 3) + '...';
	}

	/**
	 * Gets the first line of the commit message
	 * @returns The first line of the commit message
	 */
	getMessageFirstLine(): string {
		const firstLineEnd = this.message.indexOf('\n');
		if (firstLineEnd === -1) {
			return this.message;
		}
		return this.message.substring(0, firstLineEnd);
	}

	/**
	 * Gets the commit message body — everything after the first line (the
	 * subject), with surrounding blank lines trimmed.
	 * @returns The description body, or an empty string for single-line messages
	 */
	getMessageBody(): string {
		const firstLineEnd = this.message.indexOf('\n');
		if (firstLineEnd === -1) {
			return '';
		}
		return this.message.substring(firstLineEnd + 1).trim();
	}

	/**
	 * Gets the commit author name
	 * @returns The author name
	 */
	getAuthor(): string {
		return this.author;
	}

	/**
	 * Gets the commit author email
	 * @returns The author email
	 */
	getEmail(): string {
		return this.email.getValue();
	}

	/**
	 * Checks if this commit was authored by a specific email
	 * @param email - The email to check
	 * @returns True if the commit was authored by this email
	 */
	isAuthoredBy(email: Email): boolean {
		return this.email.equals(email);
	}

	/**
	 * Formats the commit date
	 * @param options - Intl.DateTimeFormat options
	 * @returns Formatted date string
	 */
	getFormattedDate(options?: Intl.DateTimeFormatOptions): string {
		const defaultOptions: Intl.DateTimeFormatOptions = {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		};

		return this.date.toLocaleString(undefined, options || defaultOptions);
	}

	/**
	 * Gets a relative time string (e.g., "2 hours ago")
	 * @returns Relative time string
	 */
	getRelativeTime(): string {
		const now = new Date();
		const diffMs = now.getTime() - this.date.getTime();
		const diffSeconds = Math.floor(diffMs / 1000);
		const diffMinutes = Math.floor(diffSeconds / 60);
		const diffHours = Math.floor(diffMinutes / 60);
		const diffDays = Math.floor(diffHours / 24);
		const diffMonths = Math.floor(diffDays / 30);
		const diffYears = Math.floor(diffDays / 365);

		if (diffSeconds < 60) {
			return 'just now';
		} else if (diffMinutes < 60) {
			return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
		} else if (diffHours < 24) {
			return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
		} else if (diffDays < 30) {
			return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
		} else if (diffMonths < 12) {
			return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
		} else {
			return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
		}
	}

	/**
	 * Compares this Commit with another for equality
	 * Two commits are equal if they have the same SHA
	 * @param other - The other Commit to compare
	 * @returns True if the commits are equal
	 */
	equals(other: Commit): boolean {
		return this.sha.equals(other.sha);
	}

	/**
	 * String representation of the Commit
	 * @returns A string in the format: "shortSha - message (author, date)"
	 */
	toString(): string {
		return `${this.getShortSha()} - ${this.getMessageFirstLine()} (${this.author}, ${this.getFormattedDate()})`;
	}
}
