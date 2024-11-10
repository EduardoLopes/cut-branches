import { Store } from '../store.svelte';

describe('Store', () => {
	let store: Store<string>;

	beforeEach(() => {
		store = Store.getInstance<string>('test');
		store.clear();
	});

	it('should initialize with undefined state', () => {
		expect(store.state).toBeUndefined();
	});

	it('should set and get state', () => {
		store.set('testValue');
		expect(store.state).toBe('testValue');
	});

	it('should update state from localStorage', () => {
		store.set('testValue');
		store.updateFromLocalStorage();
		expect(store.state).toBe('testValue');
	});

	it('should clear state', () => {
		store.set('testValue');
		store.clear();
		expect(store.state).toBeUndefined();
	});
});
