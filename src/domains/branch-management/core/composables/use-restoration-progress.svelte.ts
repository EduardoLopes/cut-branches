/**
 * Restoration Progress
 *
 * Tracks per-branch progress during a restore flow: count, percentage,
 * and a rolling estimated-time-remaining string. Subscribes to the Tauri
 * `branch-restored` event so the UI updates incrementally while the batch
 * command processes branches server-side.
 */

import { listen } from '@tauri-apps/api/event';

export function useRestorationProgress() {
	let total = $state(0);
	let processed = $state(0);
	let percent = $state(0);
	let startTime: number | null = null;
	let estimatedTimeRemaining = $state<string | null>(null);

	let unlisten: (() => void) | null = null;

	$effect(() => {
		listen('branch-restored', () => {
			tick();
		}).then((fn) => {
			unlisten = fn;
		});

		return () => {
			unlisten?.();
			unlisten = null;
		};
	});

	function start(initialTotal: number) {
		total = initialTotal;
		processed = 0;
		percent = 0;
		startTime = Date.now();
		estimatedTimeRemaining = 'Calculating...';
	}

	function tick() {
		if (total === 0) return;
		if (processed >= total) return; // clamp — Rust emits an event AND we tick from
		// onSuccess, so a single branch resolution can fire `tick` twice.

		processed++;
		percent = (processed / total) * 100;

		if (startTime && processed > 0) {
			const elapsed = Date.now() - startTime;
			const perBranch = elapsed / processed;
			const remaining = total - processed;
			const etaMs = perBranch * remaining;

			if (etaMs > 0) {
				estimatedTimeRemaining =
					etaMs < 60000
						? `${Math.ceil(etaMs / 1000)} seconds`
						: `${Math.ceil(etaMs / 60000)} minutes`;
			} else {
				estimatedTimeRemaining = 'Almost done';
			}
		}
	}

	function reset() {
		total = 0;
		processed = 0;
		percent = 0;
		startTime = null;
		estimatedTimeRemaining = null;
	}

	return {
		start,
		tick,
		reset,
		get total() {
			return total;
		},
		get processed() {
			return processed;
		},
		get percent() {
			return percent;
		},
		get estimatedTimeRemaining() {
			return estimatedTimeRemaining;
		}
	};
}
