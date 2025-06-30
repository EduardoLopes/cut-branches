import { describe, it, expect } from 'vitest';
import { z } from 'zod/v4';
import {
	validateWithSchema,
	formatZodError,
	isValidDate,
	createSafeValidator,
	safeParse
} from '../validation-utils';

describe('validation-utils', () => {
	describe('validateWithSchema', () => {
		it('should return success and data for valid input', () => {
			const schema = z.object({ name: z.string() });
			const input = { name: 'Test' };

			const result = validateWithSchema(input, schema);

			expect(result.success).toBe(true);
			expect(result.data).toEqual(input);
			expect(result.error).toBeUndefined();
		});

		it('should return failure and error for invalid input', () => {
			const schema = z.object({ name: z.string() });
			const input = { name: 123 };

			const result = validateWithSchema(input, schema);

			expect(result.success).toBe(false);
			expect(result.data).toBeUndefined();
			expect(result.error).toBeInstanceOf(z.ZodError);
		});

		it('should handle non-ZodError exceptions', () => {
			const schema = {
				parse: () => {
					throw new Error('Test error');
				}
			} as unknown as z.ZodType<unknown>;

			const result = validateWithSchema({}, schema);

			expect(result.success).toBe(false);
			expect(result.data).toBeUndefined();
			expect(result.error?.message).toBe('Test error');
		});

		it('should handle non-Error and non-ZodError exceptions', () => {
			const schema = {
				parse: () => {
					throw 'String error'; // Not an Error object
				}
			} as unknown as z.ZodType<unknown>;

			const result = validateWithSchema({}, schema);

			expect(result.success).toBe(false);
			expect(result.data).toBeUndefined();
			expect(result.error?.message).toBe('String error');
		});
	});

	describe('formatZodError', () => {
		it('should format zod error into readable string', () => {
			// Create a ZodError by forcing validation failure
			let zodError: z.ZodError | undefined;
			try {
				z.object({
					name: z.string(),
					age: z.number().positive()
				}).parse({
					name: 123,
					age: -5
				});
			} catch (error) {
				if (error instanceof z.ZodError) {
					zodError = error;
				}
			}

			expect(zodError).toBeInstanceOf(z.ZodError);

			const formattedError = formatZodError(zodError!);

			expect(formattedError).toContain('name');
			expect(formattedError).toContain('age');
			expect(formattedError).toMatch(/expected.+number|small|>0/i);
		});

		it('should properly handle paths correctly', () => {
			// Create a real ZodError with and without paths
			let zodError: z.ZodError | undefined;
			try {
				z.object({
					user: z.object({
						name: z.string()
					})
				}).parse({
					user: {
						name: 123
					}
				});
			} catch (error) {
				if (error instanceof z.ZodError) {
					zodError = error;
				}
			}

			// Create a second ZodError without a path
			let rootZodError: z.ZodError | undefined;
			try {
				z.string().parse(123);
			} catch (error) {
				if (error instanceof z.ZodError) {
					rootZodError = error;
				}
			}

			// Combine them
			const combinedErrors = new z.ZodError([...zodError!.issues, ...rootZodError!.issues]);

			const formattedError = formatZodError(combinedErrors);

			expect(formattedError).toContain('user.name:');
			expect(formattedError).toContain('Invalid input');
			expect(formattedError).toContain('expected string');
		});
	});

	describe('isValidDate', () => {
		it('should return true for valid Date objects', () => {
			expect(isValidDate(new Date())).toBe(true);
			expect(isValidDate(new Date('2023-01-01'))).toBe(true);
		});

		it('should return true for valid date strings', () => {
			expect(isValidDate('2023-01-01')).toBe(true);
			expect(isValidDate('2023-01-01T12:00:00Z')).toBe(true);
		});

		it('should return true for valid timestamps', () => {
			expect(isValidDate(Date.now())).toBe(true);
			expect(isValidDate(1672531200000)).toBe(true); // 2023-01-01
		});

		it('should return false for invalid dates', () => {
			expect(isValidDate('not-a-date')).toBe(false);
			expect(isValidDate(new Date('invalid'))).toBe(false);
			expect(isValidDate(null)).toBe(false);
			expect(isValidDate(undefined)).toBe(false);
			expect(isValidDate({})).toBe(false);
		});
	});

	describe('createSafeValidator', () => {
		it('should create a validator that returns success for valid input', () => {
			const isEven = (num: number) => {
				if (num % 2 === 0) return true;
				throw new Error('Number is not even');
			};

			const safeIsEven = createSafeValidator(isEven);
			const result = safeIsEven(2);

			expect(result.success).toBe(true);
			expect(result.value).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should create a validator that returns failure for invalid input', () => {
			const isEven = (num: number) => {
				if (num % 2 === 0) return true;
				throw new Error('Number is not even');
			};

			const safeIsEven = createSafeValidator(isEven);
			const result = safeIsEven(3);

			expect(result.success).toBe(false);
			expect(result.value).toBeUndefined();
			expect(result.error?.message).toBe('Number is not even');
		});

		it('should handle non-Error exceptions', () => {
			const throwString = () => {
				throw 'String error';
			};

			const safeValidator = createSafeValidator(throwString);
			const result = safeValidator(null as unknown);

			expect(result.success).toBe(false);
			expect(result.error?.message).toBe('String error');
		});
	});

	describe('safeParse', () => {
		it('should return parsed data for valid input', () => {
			const schema = z.object({ name: z.string() });
			const input = { name: 'Test' };
			const defaultValue = { name: 'Default' };

			const result = safeParse(input, schema, defaultValue);

			expect(result).toEqual(input);
		});

		it('should return default value for invalid input', () => {
			const schema = z.object({ name: z.string() });
			const input = { name: 123 };
			const defaultValue = { name: 'Default' };

			const result = safeParse(input, schema, defaultValue);

			expect(result).toEqual(defaultValue);
		});

		it('should return default value for exceptions during parsing', () => {
			const schema = {
				safeParse: () => {
					throw new Error('Unexpected error');
				}
			} as unknown as z.ZodType<unknown>;

			const defaultValue = { name: 'Default' };

			const result = safeParse({}, schema, defaultValue);

			expect(result).toEqual(defaultValue);
		});
	});
});
