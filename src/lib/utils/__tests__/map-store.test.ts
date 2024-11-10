import { MapStore } from '../map-store.svelte';

describe('MapStore', () => {
	let mapStore: MapStore<string, string>;

	beforeEach(() => {
		mapStore = MapStore.getInstance<string, string>('test');
		mapStore.clear();
	});

	it('should initialize with an empty map', () => {
		expect(mapStore.state.size).toBe(0);
	});

	it('should set and get values in the map', () => {
		mapStore.set('key1', 'value1');
		expect(mapStore.get('key1')).toBe('value1');
	});

	it('should delete keys from the map', () => {
		mapStore.set('key1', 'value1');
		mapStore.delete(['key1']);
		expect(mapStore.get('key1')).toBeUndefined();
	});

	it('should clear the map', () => {
		mapStore.set('key1', 'value1');
		mapStore.clear();
		expect(mapStore.state.size).toBe(0);
	});
});
