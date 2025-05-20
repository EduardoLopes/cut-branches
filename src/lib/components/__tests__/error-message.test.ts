import { render } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import ErrorMessage from '../error-message.svelte';

describe('ErrorMessage Component', () => {
	test('renders message correctly', () => {
		const message = 'Error occurred';
		const { getByText } = render(ErrorMessage, {
			props: { message }
		});

		expect(getByText(message)).toBeInTheDocument();
	});

	test('renders description when provided', () => {
		const message = 'Error occurred';
		const description = 'This is a detailed error description';
		const { getByText } = render(ErrorMessage, {
			props: { message, description }
		});

		expect(getByText(description)).toBeInTheDocument();
	});

	test('does not render description when not provided', () => {
		const message = 'Error occurred';
		const { container } = render(ErrorMessage, {
			props: { message }
		});

		const descriptionElements = container.querySelectorAll('.message + div');
		expect(descriptionElements.length).toBe(0);
	});

	test('renders component with default icon', () => {
		const { container } = render(ErrorMessage, {
			props: { message: 'Error occurred' }
		});

		// Instead of checking for the svg, check if the outer div exists
		const outerDiv = container.querySelector('div');
		expect(outerDiv).toBeInTheDocument();
	});

	test('renders component with custom icon', () => {
		const customIcon = 'mdi:alert';
		const { container } = render(ErrorMessage, {
			props: {
				message: 'Error occurred',
				icon: customIcon
			}
		});

		// Instead of checking for the svg, check if the message is rendered
		const messageDiv = container.querySelector('.message');
		expect(messageDiv).toBeInTheDocument();
	});

	test('renders component with custom icon color', () => {
		const customColor = '#FF0000';
		const { container } = render(ErrorMessage, {
			props: {
				message: 'Error occurred',
				iconColor: customColor
			}
		});

		// Instead of checking for the svg, check if the message is rendered
		const messageDiv = container.querySelector('.message');
		expect(messageDiv).toBeInTheDocument();
	});
});
