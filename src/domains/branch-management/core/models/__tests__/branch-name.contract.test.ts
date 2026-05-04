import { describe, expect, it } from 'vitest';
import { BranchName } from '../branch-name';
import cases from '$contracts/branch-name.cases.json';

describe('BranchName contract — FE side', () => {
	describe('valid inputs (must be accepted)', () => {
		for (const input of cases.valid) {
			it(`accepts ${JSON.stringify(input)}`, () => {
				expect(() => new BranchName(input)).not.toThrow();
			});
		}
	});

	describe('invalid inputs (must be rejected)', () => {
		for (const { input, reason } of cases.invalid) {
			it(`rejects ${JSON.stringify(input)} (${reason})`, () => {
				expect(() => new BranchName(input)).toThrow();
			});
		}
	});
});
