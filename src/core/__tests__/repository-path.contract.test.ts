import { describe, expect, it } from 'vitest';
import { RepositoryPath } from '../repository-path';
import cases from '$contracts/repository-path.cases.json';

describe('RepositoryPath contract — FE side', () => {
	describe('valid inputs (must be accepted)', () => {
		for (const input of cases.valid) {
			it(`accepts ${JSON.stringify(input)}`, () => {
				expect(() => new RepositoryPath(input)).not.toThrow();
			});
		}
	});

	describe('invalid inputs (must be rejected)', () => {
		for (const { input, reason } of cases.invalid) {
			it(`rejects ${JSON.stringify(input)} (${reason})`, () => {
				expect(() => new RepositoryPath(input)).toThrow();
			});
		}
	});
});
