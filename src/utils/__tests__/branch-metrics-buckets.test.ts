import { describe, test, expect } from 'vitest';
import {
	BRANCH_METRICS_BUCKET_SIZE,
	getBucketBranchNames,
	getBucketIndicesForRange,
	getBucketIndicesOutward
} from '../branch-metrics-buckets';

describe('getBucketIndicesForRange', () => {
	test('maps a range inside one bucket to that single bucket', () => {
		expect(getBucketIndicesForRange(0, 5, 20)).toEqual([0]);
		expect(getBucketIndicesForRange(21, 39, 20)).toEqual([1]);
	});

	test('spans multiple buckets when the range crosses a boundary', () => {
		expect(getBucketIndicesForRange(15, 45, 20)).toEqual([0, 1, 2]);
	});

	test('clamps a negative start to bucket zero', () => {
		expect(getBucketIndicesForRange(-3, 5, 20)).toEqual([0]);
	});

	test('returns empty for an inverted range', () => {
		expect(getBucketIndicesForRange(10, 4, 20)).toEqual([]);
	});

	test('returns empty when the whole range is negative', () => {
		expect(getBucketIndicesForRange(-5, -1, 20)).toEqual([]);
	});

	test('uses the default bucket size when none is given', () => {
		expect(getBucketIndicesForRange(0, BRANCH_METRICS_BUCKET_SIZE)).toEqual([0, 1]);
	});
});

describe('getBucketBranchNames', () => {
	const names = Array.from({ length: 45 }, (_, i) => `branch-${i}`);

	test('slices the names belonging to a bucket', () => {
		expect(getBucketBranchNames(names, 0, 20)).toEqual(names.slice(0, 20));
		expect(getBucketBranchNames(names, 1, 20)).toEqual(names.slice(20, 40));
	});

	test('returns a short tail slice for the last bucket', () => {
		expect(getBucketBranchNames(names, 2, 20)).toEqual(names.slice(40));
	});

	test('returns empty past the end of the list', () => {
		expect(getBucketBranchNames(names, 5, 20)).toEqual([]);
	});

	test('uses the default bucket size when none is given', () => {
		expect(getBucketBranchNames(names, 0)).toHaveLength(BRANCH_METRICS_BUCKET_SIZE);
	});
});

describe('getBucketIndicesOutward', () => {
	test('starts at the given bucket and alternates outward to both ends', () => {
		// 45 names in buckets of 10: buckets 0..4.
		expect(getBucketIndicesOutward(45, 2, 10)).toEqual([2, 3, 1, 4, 0]);
	});

	test('runs on past the nearer end', () => {
		expect(getBucketIndicesOutward(45, 0, 10)).toEqual([0, 1, 2, 3, 4]);
		expect(getBucketIndicesOutward(45, 4, 10)).toEqual([4, 3, 2, 1, 0]);
	});

	test('clamps a start outside the list', () => {
		expect(getBucketIndicesOutward(25, 9, 10)).toEqual([2, 1, 0]);
		expect(getBucketIndicesOutward(25, -3, 10)).toEqual([0, 1, 2]);
	});

	test('has nothing for an empty list, and uses the default bucket size', () => {
		expect(getBucketIndicesOutward(0, 0)).toEqual([]);
		expect(getBucketIndicesOutward(BRANCH_METRICS_BUCKET_SIZE * 2, 0)).toEqual([0, 1]);
	});
});
