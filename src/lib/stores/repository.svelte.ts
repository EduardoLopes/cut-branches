import { Store } from '../utils/store.svelte';
import { goto } from '$app/navigation';
import { SetStore } from '$lib/utils/set-store.svelte';

export interface Commit {
	hash: string;
	date: string;
	message: string;
	author: string;
	email: string;
}

export interface Branch {
	name: string;
	current: boolean;
	last_commit: Commit;
	fully_merged: boolean;
}

export interface Repository {
	path: string;
	branches: Branch[];
	name: string;
	currentBranch: string;
	branchesCount: number;
	id: string;
}

export class RepositoryStore extends Store<Repository | undefined> {
	constructor(repository: string) {
		super(repository);
	}

	static repositories = SetStore.getInstance<string | undefined>('repositories');

	set(value?: Repository) {
		super.set(value);

		if (value?.name) {
			goto(`/repos/${value.name}`);
			RepositoryStore.repositories.add([value.name]);
		} else {
			if (this.state?.name) {
				RepositoryStore.repositories.delete([this.state?.name]);
			}
		}
	}

	clear() {
		if (this.state?.name) {
			RepositoryStore.repositories.delete([this.state?.name]);
		}
		super.clear();
	}
}

export function getRepositoryStore(repository?: string) {
	if (!repository) {
		return;
	}

	return RepositoryStore.getInstance<Repository | undefined>('repository', repository);
}
