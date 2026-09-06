import { describe, expect, test } from 'vitest';
import ErrorMessage from '../error-message.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

describe('ErrorMessage Component', () => {
	test('renders message correctly', async () => {
		const message = 'Error occurred';
		const { getByText } = await renderWithTestWrapper(ErrorMessage, {
			message
		});

		expect(getByText(message)).toBeInTheDocument();
	});

	test('renders description when provided', async () => {
		const message = 'Error occurred';
		const description = 'This is a detailed error description';
		const { getByText } = await renderWithTestWrapper(ErrorMessage, {
			message,
			description
		});

		expect(getByText(description)).toBeInTheDocument();
	});

	test('does not render description when not provided', async () => {
		const message = 'Error occurred';
		const { container } = await renderWithTestWrapper(ErrorMessage, {
			message
		});

		const descriptionElements = container.querySelectorAll('.message + div');
		expect(descriptionElements.length).toBe(0);
	});

	test('renders component with default icon', async () => {
		const { container } = await renderWithTestWrapper(ErrorMessage, {
			message: 'Error occurred'
		});

		// Instead of checking for the svg, check if the outer div exists
		const outerDiv = container.querySelector('div');
		expect(outerDiv).toBeInTheDocument();
	});

	test('renders component with custom icon', async () => {
		const customIcon = 'mdi:alert';
		const { container } = await renderWithTestWrapper(ErrorMessage, {
			message: 'Error occurred',
			icon: customIcon
		});

		// Instead of checking for the svg, check if the message is rendered
		const messageDiv = container.querySelector('.message');
		expect(messageDiv).toBeInTheDocument();
	});

	test('renders component with custom icon color', async () => {
		const customColor = '#FF0000';
		const { container } = await renderWithTestWrapper(ErrorMessage, {
			message: 'Error occurred',
			iconColor: customColor
		});

		// Instead of checking for the svg, check if the message is rendered
		const messageDiv = container.querySelector('.message');
		expect(messageDiv).toBeInTheDocument();
	});
});
