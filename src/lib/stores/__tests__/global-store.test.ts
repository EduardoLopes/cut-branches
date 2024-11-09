import { GlobalStore } from '../global-store.svelte';

describe('GlobalStore', () => {
	let store: GlobalStore;

	beforeEach(() => {
		store = new GlobalStore();
	});

	it('should initialize lastUpdatedAt as undefined', () => {
		expect(store.lastUpdatedAt).toBeUndefined();
	});

	it('should update lastUpdatedAt', () => {
		const date = new Date();
		store.lastUpdatedAt = date;
		expect(store.lastUpdatedAt).toBe(date);
	});
});
