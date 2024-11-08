export class GlobalStore {
	lastUpdatedAt = $state<Date | undefined>(undefined);
}

export const globalStore = new GlobalStore();
