import { render } from '@testing-library/svelte';
import { describe, test, expect } from 'vitest';
import BulkActionsContainer from '../bulk-actions-container.svelte';
import TestWrapper, { testWrapperWithProps } from '$components/test-wrapper.svelte';

describe('BulkActionsContainer Component', () => {
	test('renders container with correct structure', () => {
		const { getByTestId } = render(TestWrapper, {
			props: testWrapperWithProps(BulkActionsContainer, {})
		});
		expect(getByTestId('bulk-actions-container')).toBeInTheDocument();
		expect(getByTestId('bulk-actions-left')).toBeInTheDocument();
		expect(getByTestId('bulk-actions-right')).toBeInTheDocument();
	});

	test('renders empty sections when no snippets are provided', () => {
		const { getByTestId } = render(TestWrapper, {
			props: testWrapperWithProps(BulkActionsContainer, {})
		});
		const leftSection = getByTestId('bulk-actions-left');
		const rightSection = getByTestId('bulk-actions-right');

		expect(leftSection).toBeInTheDocument();
		expect(rightSection).toBeInTheDocument();
		expect(leftSection.children.length).toBe(0);
		expect(rightSection.children.length).toBe(0);
	});

	test('forwards additional HTML attributes to root element', () => {
		const { getByTestId } = render(TestWrapper, {
			props: testWrapperWithProps(BulkActionsContainer, {
				'data-custom': 'test-value'
			})
		});
		const container = getByTestId('bulk-actions-container');
		expect(container).toHaveAttribute('data-custom', 'test-value');
	});
});
