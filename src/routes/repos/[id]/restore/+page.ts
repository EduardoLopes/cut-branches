import { redirect } from '@sveltejs/kit';
import { getRepositoryStore } from '$domains/repository-management/store/repository.svelte';

export const load = async ({ params }) => {
	const { id } = params;

	// Check if repository exists in store
	const repository = getRepositoryStore(id);

	if (!repository?.get()) {
		// Redirect to home if repository doesn't exist
		throw redirect(302, '/');
	}

	return {
		repoId: id
	};
};
