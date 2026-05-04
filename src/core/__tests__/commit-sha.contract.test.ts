import { describe, expect, it } from 'vitest';
import { CommitSha } from '../commit-sha';
import cases from '$contracts/commit-sha.cases.json';

describe('CommitSha contract — FE side', () => {
	describe('valid inputs (must be accepted)', () => {
		for (const input of cases.valid) {
			it(`accepts ${JSON.stringify(input)}`, () => {
				expect(() => new CommitSha(input)).not.toThrow();
			});
		}
	});

	describe('invalid inputs (must be rejected)', () => {
		for (const { input, reason } of cases.invalid) {
			it(`rejects ${JSON.stringify(input)} (${reason})`, () => {
				expect(() => new CommitSha(input)).toThrow();
			});
		}
	});
});
