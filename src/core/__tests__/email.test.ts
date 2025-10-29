import { describe, it, expect } from 'vitest';
import { Email } from '../email';

describe('Email', () => {
	describe('constructor', () => {
		it('should create an Email with a valid email address', () => {
			const email = new Email('user@example.com');

			expect(email.getValue()).toBe('user@example.com');
		});

		it('should normalize email to lowercase', () => {
			const email = new Email('USER@EXAMPLE.COM');

			expect(email.getValue()).toBe('user@example.com');
		});

		it('should normalize mixed case email', () => {
			const email = new Email('UsEr@ExAmPlE.CoM');

			expect(email.getValue()).toBe('user@example.com');
		});

		it('should trim whitespace from the email', () => {
			const email = new Email('  user@example.com  ');

			expect(email.getValue()).toBe('user@example.com');
		});

		it('should accept email with dots in local part', () => {
			const email = new Email('user.name@example.com');

			expect(email.getValue()).toBe('user.name@example.com');
		});

		it('should accept email with hyphens in local part', () => {
			const email = new Email('user-name@example.com');

			expect(email.getValue()).toBe('user-name@example.com');
		});

		it('should accept email with underscores in local part', () => {
			const email = new Email('user_name@example.com');

			expect(email.getValue()).toBe('user_name@example.com');
		});

		it('should accept email with plus sign in local part', () => {
			const email = new Email('user+tag@example.com');

			expect(email.getValue()).toBe('user+tag@example.com');
		});

		it('should accept email with numbers in local part', () => {
			const email = new Email('user123@example.com');

			expect(email.getValue()).toBe('user123@example.com');
		});

		it('should accept email with subdomain', () => {
			const email = new Email('user@mail.example.com');

			expect(email.getValue()).toBe('user@mail.example.com');
		});

		it('should accept email with multiple subdomains', () => {
			const email = new Email('user@mail.corporate.example.com');

			expect(email.getValue()).toBe('user@mail.corporate.example.com');
		});

		it('should accept email with hyphens in domain', () => {
			const email = new Email('user@my-domain.com');

			expect(email.getValue()).toBe('user@my-domain.com');
		});

		it('should accept email with long TLD', () => {
			const email = new Email('user@example.museum');

			expect(email.getValue()).toBe('user@example.museum');
		});

		it('should throw an error for an empty string', () => {
			expect(() => new Email('')).toThrow(
				'Invalid email format: "". Expected a valid email address (e.g., user@example.com).'
			);
		});

		it('should throw an error for a whitespace-only string', () => {
			expect(() => new Email('   ')).toThrow(
				'Invalid email format: "   ". Expected a valid email address (e.g., user@example.com).'
			);
		});

		it('should throw an error for email without @', () => {
			expect(() => new Email('userexample.com')).toThrow(
				'Invalid email format: "userexample.com". Expected a valid email address (e.g., user@example.com).'
			);
		});

		it('should throw an error for email with multiple @ symbols', () => {
			expect(() => new Email('user@example@com')).toThrow(
				'Invalid email format: "user@example@com". Expected a valid email address (e.g., user@example.com).'
			);
		});

		it('should throw an error for email without domain', () => {
			expect(() => new Email('user@')).toThrow(
				'Invalid email format: "user@". Expected a valid email address (e.g., user@example.com).'
			);
		});

		it('should throw an error for email without local part', () => {
			expect(() => new Email('@example.com')).toThrow(
				'Invalid email format: "@example.com". Expected a valid email address (e.g., user@example.com).'
			);
		});

		it('should throw an error for email without TLD', () => {
			expect(() => new Email('user@example')).toThrow(
				'Invalid email format: "user@example". Expected a valid email address (e.g., user@example.com).'
			);
		});

		it('should throw an error for email with single character TLD', () => {
			expect(() => new Email('user@example.c')).toThrow(
				'Invalid email format: "user@example.c". Expected a valid email address (e.g., user@example.com).'
			);
		});

		it('should throw an error for email starting with dot in local part', () => {
			expect(() => new Email('.user@example.com')).toThrow(
				'Invalid email format: ".user@example.com". Expected a valid email address (e.g., user@example.com).'
			);
		});

		it('should throw an error for email ending with dot in local part', () => {
			expect(() => new Email('user.@example.com')).toThrow(
				'Invalid email format: "user.@example.com". Expected a valid email address (e.g., user@example.com).'
			);
		});

		it('should throw an error for email with consecutive dots in local part', () => {
			expect(() => new Email('user..name@example.com')).toThrow(
				'Invalid email format: "user..name@example.com". Expected a valid email address (e.g., user@example.com).'
			);
		});

		it('should throw an error for email starting with dot in domain', () => {
			expect(() => new Email('user@.example.com')).toThrow(
				'Invalid email format: "user@.example.com". Expected a valid email address (e.g., user@example.com).'
			);
		});

		it('should throw an error for email ending with dot in domain', () => {
			expect(() => new Email('user@example.com.')).toThrow(
				'Invalid email format: "user@example.com.". Expected a valid email address (e.g., user@example.com).'
			);
		});

		it('should throw an error for email with consecutive dots in domain', () => {
			expect(() => new Email('user@example..com')).toThrow(
				'Invalid email format: "user@example..com". Expected a valid email address (e.g., user@example.com).'
			);
		});

		it('should throw an error for email with spaces', () => {
			expect(() => new Email('user name@example.com')).toThrow(
				'Invalid email format: "user name@example.com". Expected a valid email address (e.g., user@example.com).'
			);
		});

		it('should throw an error for email with invalid characters', () => {
			expect(() => new Email('user#name@example.com')).toThrow(
				'Invalid email format: "user#name@example.com". Expected a valid email address (e.g., user@example.com).'
			);
		});

		it('should throw an error for email with domain starting with hyphen', () => {
			expect(() => new Email('user@-example.com')).toThrow(
				'Invalid email format: "user@-example.com". Expected a valid email address (e.g., user@example.com).'
			);
		});

		it('should throw an error for email with domain ending with hyphen', () => {
			expect(() => new Email('user@example-.com')).toThrow(
				'Invalid email format: "user@example-.com". Expected a valid email address (e.g., user@example.com).'
			);
		});

		it('should throw an error for local part exceeding 64 characters', () => {
			const longLocalPart = 'a'.repeat(65) + '@example.com';
			expect(() => new Email(longLocalPart)).toThrow(
				`Invalid email format: "${longLocalPart}". Expected a valid email address (e.g., user@example.com).`
			);
		});

		it('should accept local part with exactly 64 characters', () => {
			const localPart = 'a'.repeat(64);
			const email = new Email(`${localPart}@example.com`);

			expect(email.getLocalPart()).toBe(localPart.toLowerCase());
		});

		it('should throw an error for domain exceeding 255 characters', () => {
			const longDomain = 'a'.repeat(252) + '.com'; // 252 + 4 = 256 characters
			const emailStr = `user@${longDomain}`;
			expect(() => new Email(emailStr)).toThrow(
				`Invalid email format: "${emailStr}". Expected a valid email address (e.g., user@example.com).`
			);
		});
	});

	describe('getValue', () => {
		it('should return the normalized email value', () => {
			const email = new Email('User@Example.Com');

			expect(email.getValue()).toBe('user@example.com');
		});
	});

	describe('getLocalPart', () => {
		it('should return the local part of the email', () => {
			const email = new Email('user@example.com');

			expect(email.getLocalPart()).toBe('user');
		});

		it('should return local part with dots', () => {
			const email = new Email('user.name@example.com');

			expect(email.getLocalPart()).toBe('user.name');
		});

		it('should return local part with special characters', () => {
			const email = new Email('user+tag@example.com');

			expect(email.getLocalPart()).toBe('user+tag');
		});
	});

	describe('getDomain', () => {
		it('should return the domain part of the email', () => {
			const email = new Email('user@example.com');

			expect(email.getDomain()).toBe('example.com');
		});

		it('should return domain with subdomain', () => {
			const email = new Email('user@mail.example.com');

			expect(email.getDomain()).toBe('mail.example.com');
		});

		it('should return domain in lowercase', () => {
			const email = new Email('user@EXAMPLE.COM');

			expect(email.getDomain()).toBe('example.com');
		});
	});

	describe('equals', () => {
		it('should return true for identical emails', () => {
			const email1 = new Email('user@example.com');
			const email2 = new Email('user@example.com');

			expect(email1.equals(email2)).toBe(true);
		});

		it('should return true for emails with different casing (normalized)', () => {
			const email1 = new Email('user@example.com');
			const email2 = new Email('USER@EXAMPLE.COM');

			expect(email1.equals(email2)).toBe(true);
		});

		it('should return true for emails with different whitespace (trimmed)', () => {
			const email1 = new Email('user@example.com');
			const email2 = new Email('  user@example.com  ');

			expect(email1.equals(email2)).toBe(true);
		});

		it('should return false for different emails', () => {
			const email1 = new Email('user@example.com');
			const email2 = new Email('other@example.com');

			expect(email1.equals(email2)).toBe(false);
		});

		it('should return false for same local part but different domain', () => {
			const email1 = new Email('user@example.com');
			const email2 = new Email('user@other.com');

			expect(email1.equals(email2)).toBe(false);
		});

		it('should return false for different local part but same domain', () => {
			const email1 = new Email('user@example.com');
			const email2 = new Email('other@example.com');

			expect(email1.equals(email2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return the email value', () => {
			const email = new Email('user@example.com');

			expect(email.toString()).toBe('user@example.com');
		});

		it('should return normalized email', () => {
			const email = new Email('USER@EXAMPLE.COM');

			expect(email.toString()).toBe('user@example.com');
		});
	});
});
