/**
 * Bucketing for the bulk branch-metrics query: the branch list is split into
 * fixed, position-aligned buckets so the query key for a bucket is stable
 * while the user scrolls within it — scrolling back over covered ground is a
 * cache hit, and a viewport only ever touches one or two buckets.
 */

/** Branches per bulk-metrics request. Small enough that one request stays
 *  quick on the Rust side, large enough that a viewport needs at most two. */
export const BRANCH_METRICS_BUCKET_SIZE = 20;

/** Bucket indices covering an inclusive item-index range. Returns an empty
 *  array for an inverted or negative range. */
export function getBucketIndicesForRange(
	startIndex: number,
	endIndex: number,
	bucketSize: number = BRANCH_METRICS_BUCKET_SIZE
): number[] {
	if (endIndex < startIndex || endIndex < 0) return [];
	const first = Math.floor(Math.max(0, startIndex) / bucketSize);
	const last = Math.floor(endIndex / bucketSize);
	const buckets: number[] = [];
	for (let bucket = first; bucket <= last; bucket++) buckets.push(bucket);
	return buckets;
}

/** The slice of `names` belonging to a bucket. */
export function getBucketBranchNames(
	names: readonly string[],
	bucketIndex: number,
	bucketSize: number = BRANCH_METRICS_BUCKET_SIZE
): string[] {
	return names.slice(bucketIndex * bucketSize, (bucketIndex + 1) * bucketSize);
}
