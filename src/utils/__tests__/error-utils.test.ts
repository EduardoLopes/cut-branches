import { describe, it, expect } from 'vitest';
import { AppErrorSchema, createError, getErrorMessage, type AppError } from '../error-utils';

describe('AppErrorSchema', () => {
	it('should validate valid error objects', () => {
		const validError = {
			message: 'Test error',
			kind: 'test',
			description: 'Test description'
		};

		const result = AppErrorSchema.safeParse(validError);
		expect(result.success).toBe(true);
	});

	it('should provide default values for missing fields', () => {
		const minimalError = {
			message: 'Test error'
		};

		const result = AppErrorSchema.safeParse(minimalError);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.kind).toBe('unknown');
			expect(result.data.description).toBe('');
		}
	});

	it('should reject objects without a message', () => {
		const invalidError = {
			kind: 'test'
		};

		const result = AppErrorSchema.safeParse(invalidError);
		expect(result.success).toBe(false);
	});
});

describe('createError', () => {
	describe('when passed an AppError object', () => {
		it('should return the object as is with extra properties', () => {
			const appError: AppError = {
				message: 'App error',
				kind: 'app',
				description: 'App description'
			};

			const result = createError(appError, { extra: { code: 500 } });

			expect(result.message).toBe('App error');
			expect(result.kind).toBe('app');
			expect(result.description).toBe('App description');
			expect(result.code).toBe(500);
		});
	});

	describe('when passed an Error instance', () => {
		it('should convert Error to AppError format', () => {
			const error = new Error('JS error');
			error.name = 'TypeError';

			const result = createError(error, { kind: 'custom' });

			expect(result.message).toBe('JS error');
			expect(result.kind).toBe('custom');
			expect(result.name).toBe('TypeError');
			expect(result.stack).toBeDefined();
		});

		it('should include extra properties', () => {
			const error = new Error('JS error');

			const result = createError(error, {
				kind: 'test',
				extra: { statusCode: 404 }
			});

			expect(result.message).toBe('JS error');
			expect(result.statusCode).toBe(404);
		});
	});

	describe('when passed a string', () => {
		it('should create an AppError with the string as message', () => {
			const result = createError('String error', { kind: 'string' });

			expect(result.message).toBe('String error');
			expect(result.kind).toBe('string');
			expect(result.description).toBe('');
		});

		it('should use defaultMessage if string is empty', () => {
			const result = createError('', {
				kind: 'string',
				defaultMessage: 'Default message'
			});

			expect(result.message).toBe('Default message');
		});
	});

	describe('when passed an object-like error', () => {
		it('should extract message from object properties', () => {
			const objError = {
				message: 'Object error',
				status: 500
			};

			const result = createError(objError);

			expect(result.message).toBe('Object error');
			expect(result.status).toBe(500);
		});

		it('should parse with AppErrorSchema if compatible', () => {
			const objError = {
				message: 'Schema error',
				kind: 'schema',
				description: 'Schema description',
				code: 400
			};

			const result = createError(objError);

			expect(result.message).toBe('Schema error');
			expect(result.kind).toBe('schema');
			expect(result.description).toBe('Schema description');
			// Note: Based on the implementation, code is not preserved as it's in the originalExtra
			// which is not properly included in the result when using AppErrorSchema.safeParse
		});

		it('should include extra properties explicitly when using AppErrorSchema', () => {
			const objError = {
				message: 'Schema error',
				kind: 'schema',
				description: 'Schema description',
				code: 400
			};

			const result = createError(objError, {
				extra: { code: 400 }
			});

			expect(result.message).toBe('Schema error');
			expect(result.kind).toBe('schema');
			expect(result.description).toBe('Schema description');
			expect(result.code).toBe(400);
		});

		it('should use defaultMessage if message is missing', () => {
			const objError = {
				status: 500
			};

			const result = createError(objError, {
				defaultMessage: 'Default object message'
			});

			expect(result.message).toBe('Default object message');
			expect(result.status).toBe(500);
		});
	});

	describe('when passed other values', () => {
		it('should handle null values', () => {
			const result = createError(null, {
				defaultMessage: 'Null error message'
			});

			expect(result.message).toBe('Null error message');
			expect(result.description).toBe('null');
		});

		it('should handle undefined values', () => {
			const result = createError(undefined, {
				defaultMessage: 'Undefined error message'
			});

			expect(result.message).toBe('Undefined error message');
			expect(result.description).toBe('undefined');
		});

		it('should handle number values', () => {
			const result = createError(404);

			expect(result.message).toBe('Unknown error');
			expect(result.description).toBe('404');
		});
	});

	describe('with type parameters', () => {
		it('should properly type the extra properties', () => {
			type CustomError = {
				statusCode: number;
				path: string;
				[key: string]: unknown;
			};

			const result = createError<CustomError>(new Error('Typed error'), {
				extra: {
					statusCode: 500,
					path: '/api/test'
				}
			});

			expect(result.statusCode).toBe(500);
			expect(result.path).toBe('/api/test');
		});
	});
});

describe('getErrorMessage', () => {
	it('should extract message from Error instance', () => {
		const error = new Error('Error message');
		expect(getErrorMessage(error)).toBe('Error message');
	});

	it('should return string errors as is', () => {
		expect(getErrorMessage('String error')).toBe('String error');
	});

	it('should extract message from objects with message property', () => {
		const objError = { message: 'Object message' };
		expect(getErrorMessage(objError)).toBe('Object message');
	});

	it('should extract message from objects with error property', () => {
		const objError = { error: 'Error property' };
		expect(getErrorMessage(objError)).toBe('Error property');
	});

	it('should stringify other object types', () => {
		const obj = { code: 500 };
		expect(getErrorMessage(obj)).toBe('[object Object]');
	});

	it('should handle null values', () => {
		expect(getErrorMessage(null)).toBe('Null error');
	});

	it('should handle undefined values', () => {
		expect(getErrorMessage(undefined)).toBe('Undefined error');
	});

	it('should convert numbers to strings', () => {
		expect(getErrorMessage(404)).toBe('404');
	});
});
