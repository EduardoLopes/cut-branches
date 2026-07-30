import { describe, it, expect, beforeEach } from 'vitest';
import { readPersistedCollapsed, sidebarCollapsed } from '../sidebar-collapsed.svelte';

beforeEach(() => {
	sidebarCollapsed.set(false);
	localStorage.clear();
});

describe('sidebarCollapsed', () => {
	it('starts expanded when nothing has been persisted', () => {
		expect(sidebarCollapsed.current).toBe(false);
	});

	it('toggles between the rail and the full sidebar', () => {
		sidebarCollapsed.toggle();
		expect(sidebarCollapsed.current).toBe(true);

		sidebarCollapsed.toggle();
		expect(sidebarCollapsed.current).toBe(false);
	});

	it('persists each change across sessions', () => {
		sidebarCollapsed.toggle();
		expect(localStorage.getItem('sidebar-collapsed')).toBe('true');

		// `setLocalStorage` drops the key for falsy values, and the initial read
		// defaults an absent key to expanded — so removal *is* persisted `false`.
		sidebarCollapsed.set(false);
		expect(localStorage.getItem('sidebar-collapsed')).toBeNull();
	});

	describe('readPersistedCollapsed', () => {
		it('restores a persisted collapsed sidebar', () => {
			localStorage.setItem('sidebar-collapsed', 'true');

			expect(readPersistedCollapsed()).toBe(true);
		});

		it('defaults to expanded when nothing is persisted', () => {
			expect(readPersistedCollapsed()).toBe(false);
		});

		it('defaults to expanded for a non-boolean persisted value', () => {
			localStorage.setItem('sidebar-collapsed', '"yes"');

			expect(readPersistedCollapsed()).toBe(false);
		});
	});
});
