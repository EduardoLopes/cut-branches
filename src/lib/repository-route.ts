import { resolve } from '$app/paths';

/**
 * Path of a repository's page.
 *
 * A repository id is an opaque backend string that can contain `#`, `?` or `%`.
 * Interpolating it into a template literal (`/repos/${id}`) leaves those
 * characters raw, so the URL parser reads them as a fragment, a query string or
 * a broken escape and the route resolves to nothing. Percent-encoding the
 * segment keeps the id inside the path; SvelteKit decodes route params again,
 * so `page.params.id` still yields the original id.
 */
export function resolveRepositoryPath(id: string) {
	return resolve('/repos/[id]', { id: encodeURIComponent(id) });
}
