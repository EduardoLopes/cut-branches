import { SetStore } from '../set-store.svelte';

describe('SetStore', () => {
	let setStore: SetStore<string>;

	beforeEach(() => {
		setStore = SetStore.getInstance<string>('test');
		setStore.clear();
	});

	it('should initialize with an empty set', () => {
		expect(setStore.state.size).toBe(0);
	});

	it('should add items to the set', () => {
		setStore.add(['item1', 'item2']);
		expect(setStore.state.has('item1')).toBe(true);
		expect(setStore.state.has('item2')).toBe(true);
	});

	it('should delete items from the set', () => {
		setStore.add(['item1', 'item2']);
		setStore.delete(['item1']);
		expect(setStore.state.has('item1')).toBe(false);
		expect(setStore.state.has('item2')).toBe(true);
	});

	it('should clear the set', () => {
		setStore.add(['item1', 'item2']);
		setStore.clear();
		expect(setStore.state.size).toBe(0);
	});
});
