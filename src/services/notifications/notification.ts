/**
 * @module Notification Value Object
 * @description Immutable domain model representing a notification.
 * Enforces validation rules and provides value equality.
 */

export type NotificationFeedback = 'success' | 'danger' | 'warning' | 'default';

export interface NotificationData {
	id?: string;
	message?: string;
	title?: string;
	feedback?: NotificationFeedback;
	date?: number | null;
}

/**
 * Custom error class for Notification validation errors
 */
export class NotificationValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'NotificationValidationError';
	}
}

/**
 * Notification Value Object
 * Represents an immutable notification with validation and value equality.
 *
 * Domain Rules:
 * - Either message or title must be provided (not both empty)
 * - ID is optional but if provided must be a valid non-empty string (auto-generated if not provided)
 * - Date is optional but if provided must be a valid timestamp (auto-generated if not provided, null if explicitly set to null)
 * - Feedback must be one of the allowed values
 */
export class Notification {
	readonly id: string;
	readonly message: string;
	readonly title: string;
	readonly feedback: NotificationFeedback;
	readonly date: number | null;

	private constructor(data: {
		id: string;
		message: string;
		title: string;
		feedback: NotificationFeedback;
		date: number | null;
	}) {
		// Validate invariants
		this.validateId(data.id);
		if (data.date !== null) {
			this.validateDate(data.date);
		}
		this.validateContent(data.message, data.title);
		this.validateFeedback(data.feedback);

		// Assign validated values
		this.id = data.id;
		this.message = data.message.trim();
		this.title = data.title.trim();
		this.feedback = data.feedback;
		this.date = data.date;

		// Freeze the object to ensure immutability
		Object.freeze(this);
	}

	/**
	 * Validates that the ID is a non-empty string
	 * @throws {NotificationValidationError} If ID is invalid
	 */
	private validateId(id: string): void {
		if (typeof id !== 'string' || id.trim().length === 0) {
			throw new NotificationValidationError('Notification ID must be a non-empty string');
		}
	}

	/**
	 * Validates that the date is a valid positive timestamp
	 * @throws {NotificationValidationError} If date is invalid
	 */
	private validateDate(date: number): void {
		if (typeof date !== 'number' || !Number.isFinite(date) || date < 0) {
			throw new NotificationValidationError('Notification date must be a valid positive timestamp');
		}

		// Check if date is not in the future (with a small tolerance for clock skew)
		const maxFutureDate = Date.now() + 60000; // 1 minute tolerance
		if (date > maxFutureDate) {
			throw new NotificationValidationError('Notification date cannot be in the future');
		}
	}

	/**
	 * Validates that either message or title is provided
	 * @throws {NotificationValidationError} If both are empty
	 */
	private validateContent(message: string, title: string): void {
		const hasMessage = typeof message === 'string' && message.trim().length > 0;
		const hasTitle = typeof title === 'string' && title.trim().length > 0;

		if (!hasMessage && !hasTitle) {
			throw new NotificationValidationError(
				'Notification must have either a message or a title (or both)'
			);
		}

		// Validate maximum length to prevent abuse
		const MAX_LENGTH = 1000;
		if (message.length > MAX_LENGTH) {
			throw new NotificationValidationError(
				`Notification message cannot exceed ${MAX_LENGTH} characters`
			);
		}
		if (title.length > MAX_LENGTH) {
			throw new NotificationValidationError(
				`Notification title cannot exceed ${MAX_LENGTH} characters`
			);
		}
	}

	/**
	 * Validates that feedback is one of the allowed values
	 * @throws {NotificationValidationError} If feedback is invalid
	 */
	private validateFeedback(feedback: NotificationFeedback): void {
		const validFeedbacks: NotificationFeedback[] = ['success', 'danger', 'warning', 'default'];
		if (!validFeedbacks.includes(feedback)) {
			throw new NotificationValidationError(
				`Notification feedback must be one of: ${validFeedbacks.join(', ')}`
			);
		}
	}

	/**
	 * Factory method to create a new Notification
	 * @param data - Partial notification data
	 * @returns A new Notification instance with defaults applied
	 * @throws {NotificationValidationError} If validation fails
	 */
	static create(data: NotificationData): Notification {
		const id = data.id || crypto.randomUUID();
		const message = data.message || '';
		const title = data.title || '';
		const feedback = data.feedback || 'default';
		// If date is explicitly null, keep it null; if undefined, use current time
		const date = data.date === null ? null : data.date === undefined ? Date.now() : data.date;

		return new Notification({
			id,
			message,
			title,
			feedback,
			date
		});
	}

	/**
	 * Creates a new Notification with updated properties
	 * @param updates - Partial data to update
	 * @returns A new Notification instance with updates applied
	 * @throws {NotificationValidationError} If validation fails
	 */
	with(updates: Partial<NotificationData>): Notification {
		return Notification.create({
			id: this.id,
			message: this.message,
			title: this.title,
			feedback: this.feedback,
			date: this.date,
			...updates
		});
	}

	/**
	 * Checks value equality with another Notification
	 * @param other - Another Notification to compare
	 * @returns True if all properties are equal
	 */
	equals(other: Notification): boolean {
		if (!Notification.isNotification(other)) {
			return false;
		}

		return (
			this.id === other.id &&
			this.message === other.message &&
			this.title === other.title &&
			this.feedback === other.feedback &&
			this.date === other.date
		);
	}

	/**
	 * Checks if this notification has the same ID as another
	 * Useful for identity comparison in collections
	 * @param other - Another Notification to compare
	 * @returns True if IDs match
	 */
	hasSameIdentity(other: Notification): boolean {
		return Notification.isNotification(other) && this.id === other.id;
	}

	/**
	 * Returns the notification's display text (title or message)
	 * Prioritizes title over message
	 * @returns The primary text to display
	 */
	getDisplayText(): string {
		return this.title.length > 0 ? this.title : this.message;
	}

	/**
	 * Checks if this notification is a success notification
	 * @returns True if feedback is 'success'
	 */
	isSuccess(): boolean {
		return this.feedback === 'success';
	}

	/**
	 * Checks if this notification is an error/danger notification
	 * @returns True if feedback is 'danger'
	 */
	isError(): boolean {
		return this.feedback === 'danger';
	}

	/**
	 * Checks if this notification is a warning notification
	 * @returns True if feedback is 'warning'
	 */
	isWarning(): boolean {
		return this.feedback === 'warning';
	}

	/**
	 * Checks if the notification is older than a given date
	 * @param date - Date to compare against (defaults to now)
	 * @returns True if this notification is older (false if date is null)
	 */
	isOlderThan(date: number = Date.now()): boolean {
		if (this.date === null) return false;
		return this.date < date;
	}

	/**
	 * Checks if the notification is newer than a given date
	 * @param date - Date to compare against (defaults to now)
	 * @returns True if this notification is newer (false if date is null)
	 */
	isNewerThan(date: number = Date.now()): boolean {
		if (this.date === null) return false;
		return this.date > date;
	}

	/**
	 * Gets the age of the notification in milliseconds
	 * @returns Age in milliseconds (null if date is not set)
	 */
	getAge(): number | null {
		if (this.date === null) return null;
		return Date.now() - this.date;
	}

	/**
	 * Converts the Notification to a plain object
	 * @returns Plain object representation
	 */
	toJSON(): Required<NotificationData> {
		return {
			id: this.id,
			message: this.message,
			title: this.title,
			feedback: this.feedback,
			date: this.date
		};
	}

	/**
	 * Creates a Notification from a plain object (e.g., from JSON parsing)
	 * @param json - Plain object with notification data
	 * @returns A new Notification instance
	 * @throws {NotificationValidationError} If validation fails
	 */
	static fromJSON(json: unknown): Notification {
		if (typeof json !== 'object' || json === null) {
			throw new NotificationValidationError('Invalid JSON data for Notification');
		}

		const data = json as Record<string, unknown>;

		return Notification.create({
			id: typeof data.id === 'string' ? data.id : undefined,
			message: typeof data.message === 'string' ? data.message : undefined,
			title: typeof data.title === 'string' ? data.title : undefined,
			feedback:
				typeof data.feedback === 'string' &&
				['success', 'danger', 'warning', 'default'].includes(data.feedback)
					? (data.feedback as NotificationFeedback)
					: undefined,
			date: typeof data.date === 'number' ? data.date : undefined
		});
	}

	/**
	 * Type guard to check if a value is a Notification
	 * @param value - Value to check
	 * @returns True if value is a Notification instance
	 */
	static isNotification(value: unknown): value is Notification {
		return value instanceof Notification;
	}

	/**
	 * Compares two notifications by date (for sorting)
	 * Notifications without dates are sorted to the end
	 * @param a - First notification
	 * @param b - Second notification
	 * @returns Negative if a is older, positive if a is newer, 0 if equal
	 */
	static compareByDate(a: Notification, b: Notification): number {
		// Notifications without dates go to the end
		if (a.date === null && b.date === null) return 0;
		if (a.date === null) return 1;
		if (b.date === null) return -1;
		return a.date - b.date;
	}

	/**
	 * Compares two notifications by date in descending order (for sorting)
	 * Notifications without dates are sorted to the end
	 * @param a - First notification
	 * @param b - Second notification
	 * @returns Negative if a is newer, positive if a is older, 0 if equal
	 */
	static compareByDateDesc(a: Notification, b: Notification): number {
		// Notifications without dates go to the end
		if (a.date === null && b.date === null) return 0;
		if (a.date === null) return 1;
		if (b.date === null) return -1;
		return b.date - a.date;
	}
}
