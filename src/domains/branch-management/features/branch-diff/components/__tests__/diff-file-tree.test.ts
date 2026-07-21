import { describe, expect, it, vi } from 'vitest';
import DiffFileTree from '../diff-file-tree.svelte';
import type { ChangedFile, FileChangeStatus } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

const file = (path: string, status: FileChangeStatus = 'modified'): ChangedFile => ({
	path,
	oldPath: null,
	status,
	linesAdded: 1,
	linesRemoved: 1,
	isBinary: false
});

const defaultFiles = [file('src/app.ts'), file('src/new.ts', 'added'), file('README.md')];

describe('DiffFileTree', () => {
	it('renders directories expanded with their files visible', async () => {
		const { getByText, container } = renderWithTestWrapper(DiffFileTree, {
			files: defaultFiles,
			onSelectFile: vi.fn()
		});

		await expect.element(getByText('src')).toBeInTheDocument();
		await expect.element(getByText('app.ts')).toBeInTheDocument();
		await expect.element(getByText('new.ts')).toBeInTheDocument();
		await expect.element(getByText('README.md')).toBeInTheDocument();
		expect(container.querySelectorAll('[data-testid="diff-tree-file"]')).toHaveLength(3);
	});

	it('fires onSelectFile with the changed file when a file node is activated', async () => {
		const onSelectFile = vi.fn();
		const { getByText } = renderWithTestWrapper(DiffFileTree, {
			files: defaultFiles,
			onSelectFile
		});

		await getByText('new.ts').click();

		expect(onSelectFile).toHaveBeenCalledWith(defaultFiles[1]);
	});

	it('does not fire onSelectFile for directory nodes', async () => {
		const onSelectFile = vi.fn();
		const { getByText } = renderWithTestWrapper(DiffFileTree, {
			files: defaultFiles,
			onSelectFile
		});

		await getByText('src').click();

		expect(onSelectFile).not.toHaveBeenCalled();
	});

	it('marks the node of the selected path', async () => {
		const { getByText, container } = renderWithTestWrapper(DiffFileTree, {
			files: defaultFiles,
			selectedPath: 'src/new.ts',
			onSelectFile: vi.fn()
		});

		await expect.element(getByText('new.ts')).toBeInTheDocument();
		const selected = container.querySelector('[aria-selected="true"]');
		expect(selected?.textContent).toContain('new.ts');
	});

	it('tints each file with its change status', async () => {
		const { getByText, container } = renderWithTestWrapper(DiffFileTree, {
			files: defaultFiles,
			onSelectFile: vi.fn()
		});

		await expect.element(getByText('new.ts')).toBeInTheDocument();
		expect(container.querySelector('[data-status="added"]')).not.toBeNull();
		expect(container.querySelectorAll('[data-status="modified"]')).toHaveLength(2);
	});
});
