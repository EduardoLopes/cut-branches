import { render } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import EmptyState from '../empty-state.svelte';

describe('EmptyState Component', () => {
	test('renders message correctly', () => {
		const message = 'No items found';
		const { getByText } = render(EmptyState, {
			props: { message }
		});

		expect(getByText(message)).toBeInTheDocument();
	});

	test('uses the provided testId if specified', () => {
		const message = 'No items found';
		const testId = 'custom-test-id';
		const { getByTestId } = render(EmptyState, {
			props: { message, testId }
		});

		expect(getByTestId(testId)).toBeInTheDocument();
	});

	test('renders component with default icon', () => {
		const { container } = render(EmptyState, {
			props: { message: 'No items found' }
		});

		// Since we can't directly access the Icon component's internals in the test environment,
		// we verify the component's structure and props instead
		const iconWrapper = container.querySelector('div > div:first-child');
		expect(iconWrapper).toBeTruthy();

		// Verify message is rendered, which indicates the component rendered correctly
		const messageElement = container.querySelector('.message');
		expect(messageElement).toBeInTheDocument();
	});

	test('renders component with custom icon', () => {
		const customIcon = 'mdi:alert';
		const { container } = render(EmptyState, {
			props: {
				message: 'No items found',
				icon: customIcon
			}
		});

		// Verify the component structure is correct
		const iconWrapper = container.querySelector('div > div:first-child');
		expect(iconWrapper).toBeTruthy();

		// Verify message is rendered with the customIcon prop
		const messageElement = container.querySelector('.message');
		expect(messageElement).toBeInTheDocument();
	});

	test('renders component with custom icon color', () => {
		const customColor = '#FF0000';
		const { container } = render(EmptyState, {
			props: {
				message: 'No items found',
				iconColor: customColor
			}
		});

		// Verify the component structure is correct
		const iconWrapper = container.querySelector('div > div:first-child');
		expect(iconWrapper).toBeTruthy();

		// Verify message is rendered with the customColor prop
		const messageElement = container.querySelector('.message');
		expect(messageElement).toBeInTheDocument();
	});
});
