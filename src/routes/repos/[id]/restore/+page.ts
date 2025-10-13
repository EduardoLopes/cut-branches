export const load = async ({ params }) => {
	const { id } = params;

	return {
		repoId: id
	};
};
