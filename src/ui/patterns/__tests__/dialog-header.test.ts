import { describe, expect, test } from 'vitest';
import DialogHeader from '../dialog-header.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

describe('DialogHeader', () => {
	test('renders the title, subtitle and icon stamp', () => {
		const screen = renderWithTestWrapper(DialogHeader, {
			title: 'Find repositories',
			subtitle: 'Scan a location for git repositories.',
			icon: 'lucide:folder-search'
		});

		const header = screen.getByTestId('dialog-header').element();
		expect(header.querySelector('h2')).toHaveTextContent('Find repositories');
		expect(header).toHaveTextContent('Scan a location for git repositories.');
		expect(header.querySelector('[data-component="stamp"]')).not.toBeNull();
	});

	test('renders without a subtitle and tags the subtitle when asked', () => {
		const bare = renderWithTestWrapper(DialogHeader, { title: 'Remove', icon: 'lucide:trash-2' });
		expect(bare.getByTestId('dialog-header')).toHaveTextContent('Remove');

		const tagged = renderWithTestWrapper(DialogHeader, {
			title: 'Delete branches',
			subtitle: 'Are you sure?',
			icon: 'lucide:trash-2',
			subtitleTestId: 'question'
		});
		expect(tagged.getByTestId('question')).toHaveTextContent('Are you sure?');
	});
});
