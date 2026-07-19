/**
 * Maps a changed file's path to a shiki language id for diff highlighting.
 *
 * Deliberately small: covers the languages this app's users are likely to
 * review. Unknown extensions return `null`, which the renderer treats as
 * "plain text — skip highlighting" rather than an error.
 */

const FILENAME_LANGS: Record<string, string> = {
	dockerfile: 'docker',
	makefile: 'make'
};

const EXTENSION_LANGS: Record<string, string> = {
	ts: 'typescript',
	mts: 'typescript',
	cts: 'typescript',
	tsx: 'tsx',
	js: 'javascript',
	mjs: 'javascript',
	cjs: 'javascript',
	jsx: 'jsx',
	svelte: 'svelte',
	vue: 'vue',
	rs: 'rust',
	json: 'json',
	jsonc: 'jsonc',
	css: 'css',
	scss: 'scss',
	less: 'less',
	html: 'html',
	md: 'markdown',
	mdx: 'mdx',
	yml: 'yaml',
	yaml: 'yaml',
	toml: 'toml',
	sh: 'shellscript',
	bash: 'shellscript',
	zsh: 'shellscript',
	py: 'python',
	go: 'go',
	java: 'java',
	kt: 'kotlin',
	swift: 'swift',
	rb: 'ruby',
	php: 'php',
	c: 'c',
	h: 'c',
	cpp: 'cpp',
	cc: 'cpp',
	hpp: 'cpp',
	cs: 'csharp',
	sql: 'sql',
	xml: 'xml',
	graphql: 'graphql',
	gql: 'graphql',
	svg: 'xml'
};

/**
 * Resolve the shiki language for a file path, or `null` for plain text.
 * Matches well-known extensionless filenames (Dockerfile, Makefile) first,
 * then the extension.
 */
export function getDiffLanguage(filePath: string): string | null {
	const fileName = filePath.split('/').pop() ?? '';
	const byName = FILENAME_LANGS[fileName.toLowerCase()];
	if (byName) {
		return byName;
	}

	const dotIndex = fileName.lastIndexOf('.');
	if (dotIndex <= 0) {
		return null;
	}
	const extension = fileName.slice(dotIndex + 1).toLowerCase();
	return EXTENSION_LANGS[extension] ?? null;
}
