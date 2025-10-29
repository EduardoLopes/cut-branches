/**
 * Email Value Object
 *
 * Represents an email address with validation and normalization.
 * Ensures that only valid email formats are created and provides type safety.
 */

export class Email {
	private readonly value: string;

	/**
	 * Creates a new Email instance
	 * @param email - The email address
	 * @throws {Error} If the email format is invalid
	 */
	constructor(email: string) {
		const normalized = email.trim().toLowerCase();

		if (!this.isValidEmail(normalized)) {
			throw new Error(
				`Invalid email format: "${email}". Expected a valid email address (e.g., user@example.com).`
			);
		}

		this.value = normalized;
	}

	/**
	 * Gets the email address value
	 * @returns The email address string
	 */
	getValue(): string {
		return this.value;
	}

	/**
	 * Gets the local part of the email (before @)
	 * @returns The local part of the email
	 * @example new Email('user@example.com').getLocalPart() // returns 'user'
	 */
	getLocalPart(): string {
		return this.value.split('@')[0];
	}

	/**
	 * Gets the domain part of the email (after @)
	 * @returns The domain part of the email
	 * @example new Email('user@example.com').getDomain() // returns 'example.com'
	 */
	getDomain(): string {
		return this.value.split('@')[1];
	}

	/**
	 * Compares this Email with another for equality
	 * @param other - The other Email to compare
	 * @returns True if the emails are equal
	 */
	equals(other: Email): boolean {
		return this.value === other.getValue();
	}

	/**
	 * Validates the email format
	 * Uses a practical regex that covers most common email formats
	 * @param email - The email to validate
	 * @returns True if valid
	 */
	private isValidEmail(email: string): boolean {
		if (!email || email.length === 0) {
			return false;
		}

		// Basic email validation regex
		// Covers most common cases without being overly strict
		// Format: local-part@domain
		// Local part: alphanumeric, dots, hyphens, underscores, plus signs
		// Domain: alphanumeric, dots, hyphens
		const emailPattern = /^[a-z0-9._+%-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

		if (!emailPattern.test(email)) {
			return false;
		}

		// Additional validation: check for invalid patterns
		// - Cannot start or end with a dot
		// - Cannot have consecutive dots
		// - Must have @ symbol
		const parts = email.split('@');
		if (parts.length !== 2) {
			return false;
		}

		const [localPart, domain] = parts;

		// Local part validations
		if (localPart.length === 0 || localPart.length > 64) {
			return false;
		}
		if (localPart.startsWith('.') || localPart.endsWith('.')) {
			return false;
		}
		if (localPart.includes('..')) {
			return false;
		}

		// Domain validations
		if (domain.length === 0 || domain.length > 255) {
			return false;
		}
		if (domain.startsWith('.') || domain.endsWith('.')) {
			return false;
		}
		if (domain.includes('..')) {
			return false;
		}

		// Validate each domain label (part between dots)
		const domainLabels = domain.split('.');
		for (const label of domainLabels) {
			if (label.length === 0) {
				return false;
			}
			if (label.startsWith('-') || label.endsWith('-')) {
				return false;
			}
		}

		return true;
	}

	/**
	 * String representation of the Email
	 * @returns The email value
	 */
	toString(): string {
		return this.value;
	}
}
