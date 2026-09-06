import { resolve } from '$app/paths';

/**
 * The sub-routes that live under a repository page.
 *
 * Keeping them as a union (instead of an arbitrary string) means a typo is a
 * type error, and every value maps to a real `src/routes/repos/[id]/*` folder.
 */
export type RepositorySubPath = 'diff' | 'history' | 'restore' | 'worktrees';

/**
 * Path of a repository's page.
 *
 * A repository id is an opaque backend string that can contain `#`, `?` or `%`.
 * Interpolating it into a template literal (`/repos/${id}`) leaves those
 * characters raw, so the URL parser reads them as a fragment, a query string or
 * a broken escape and the route resolves to nothing. Percent-encoding the
 * segment keeps the id inside the path; SvelteKit decodes route params again,
 * so `page.params.id` still yields the original id.
 *
 * An empty id has no page to point at — SvelteKit's `resolve` throws on a
 * missing parameter — so it falls back to the repository index rather than
 * blowing up a render or a navigation handler.
 */
export function resolveRepositoryPath(id: string) {
	if (!id) return resolve('/repos');

	return resolve('/repos/[id]', { id: encodeURIComponent(id) });
}

/**
 * Path of a page nested under a repository (`/repos/<id>/diff`, …).
 *
 * Same encoding and empty-id rules as {@link resolveRepositoryPath}. The route
 * ids are spelled out one by one because `resolve` takes a literal route id,
 * which is what lets SvelteKit type-check that the route actually exists.
 */
export function resolveRepositorySubPath(id: string, subPath: RepositorySubPath) {
	if (!id) return resolve('/repos');

	const params = { id: encodeURIComponent(id) };

	switch (subPath) {
		case 'diff':
			return resolve('/repos/[id]/diff', params);
		case 'history':
			return resolve('/repos/[id]/history', params);
		case 'restore':
			return resolve('/repos/[id]/restore', params);
		case 'worktrees':
			return resolve('/repos/[id]/worktrees', params);
	}
}
