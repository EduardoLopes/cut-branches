<script lang="ts">
	// Tree navigation over the changed files: directories group the paths
	// (single-child runs compressed) and each leaf is a changed file with its
	// status icon. Pure delivery-layer UI — the owner receives the clicked
	// file via `onSelectFile` and decides what "navigating to it" means.
	import Icon from '@iconify/svelte';
	import type { Key, TreeItemApi, TreeNodeInput } from '@pindoba/core-tree-view';
	import Stamp from '@pindoba/svelte-stamp';
	import TreeView from '@pindoba/svelte-tree-view';
	import { buildDiffFileTree, type DiffFileTreeNode } from '../models/build-diff-file-tree';
	import type { ChangedFile, FileChangeStatus } from '$infrastructure/bindings';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		files: ChangedFile[];
		/** Path of the file currently navigated to — highlights its node. */
		selectedPath?: string | null;
		/** Fired when the user activates a file node (never a directory). */
		onSelectFile: (file: ChangedFile) => void;
	}

	let { files, selectedPath = null, onSelectFile }: Props = $props();

	const tree = $derived(buildDiffFileTree(files));
	const fileByPath = $derived(new Map(files.map((file) => [file.path, file])));

	function toItems(nodes: DiffFileTreeNode[]): TreeNodeInput[] {
		return nodes.map((node) => ({
			id: node.path,
			label: node.label,
			...(node.children
				? { children: toItems(node.children) }
				: { 'data-testid': 'diff-tree-file' })
		}));
	}
	const items = $derived(toItems(tree));

	// Directories start expanded — a review tree exists to be scanned, not
	// discovered branch by branch. Passed as explicit keys because published
	// @pindoba/svelte-tree-view builds default `expandedKeys` to an empty set,
	// overriding per-node `defaultExpanded` flags. Fixed upstream (pindoba
	// d91e6a55); these explicit keys can move to per-node flags once the next
	// release ships.
	function collectDirPaths(nodes: DiffFileTreeNode[], into: string[] = []): string[] {
		for (const node of nodes) {
			if (node.children) {
				into.push(node.path);
				collectDirPaths(node.children, into);
			}
		}
		return into;
	}
	const defaultExpandedKeys = $derived(collectDirPaths(tree));

	const selectedKeys = $derived<Set<Key>>(selectedPath ? new Set([selectedPath]) : new Set());

	function activate(key: Key) {
		const file = fileByPath.get(String(key));
		if (file) {
			onSelectFile(file);
		}
	}

	const STATUS_ICON: Record<FileChangeStatus, string> = {
		added: 'lucide:file-plus',
		deleted: 'lucide:file-minus',
		modified: 'lucide:file-pen',
		renamed: 'lucide:file-symlink'
	};

	const statusTint = css({
		display: 'inline-flex',
		'&[data-status="added"]': { color: 'success.text' },
		'&[data-status="deleted"]': { color: 'danger.text' },
		'&[data-status="modified"]': { color: 'primary.text' },
		'&[data-status="renamed"]': { color: 'warning.text' }
	});
</script>

{#snippet nodeIcon(item: TreeItemApi)}
	{@const file = fileByPath.get(String(item.id))}
	{#if file}
		<span class={statusTint} data-status={file.status} title={file.status}>
			<Stamp size="sm" shape="square" emphasis="ghost" background="transparent" border="none">
				<Icon icon={STATUS_ICON[file.status]} />
			</Stamp>
		</span>
	{:else}
		<Stamp size="sm" shape="square" emphasis="ghost" background="transparent" border="none">
			<Icon icon={item.expanded ? 'lucide:folder-open' : 'lucide:folder'} />
		</Stamp>
	{/if}
{/snippet}

<TreeView
	{items}
	{defaultExpandedKeys}
	{selectedKeys}
	size="sm"
	selectionMode="single"
	aria-label="Changed files"
	leading={nodeIcon}
	onAction={activate}
	data-testid="diff-file-tree"
/>
