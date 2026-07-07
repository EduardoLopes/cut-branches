import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';

// /settings has no content of its own — send it to the first section so the
// nav always has an active item. Each section is a real route beneath here.
export const load = () => {
	redirect(307, resolve('/settings/feature-flags'));
};
