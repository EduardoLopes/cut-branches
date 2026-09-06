import { createRawSnippet } from 'svelte';
import { describe, it, expect } from 'vitest';
import SettingsField from '../settings-field.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

describe('SettingsField', () => {
	it('renders the heading and subheading', async () => {
		const screen = await renderWithTestWrapper(SettingsField, {
			heading: 'Threshold',
			subheading: 'How old is stale',
			testId: 'field-threshold'
		});

		expect(screen.getByText('Threshold')).toBeInTheDocument();
		expect(screen.getByText('How old is stale')).toBeInTheDocument();
		expect(screen.getByTestId('field-threshold')).toBeInTheDocument();
	});

	it('renders a read-only value on the right when no control is given', async () => {
		const screen = await renderWithTestWrapper(SettingsField, {
			heading: 'App version',
			value: '0.5.0'
		});

		expect(screen.getByText('App version')).toBeInTheDocument();
		expect(screen.getByText('0.5.0')).toBeInTheDocument();
	});

	it('renders a control snippet on the right, taking precedence over value', async () => {
		const control = createRawSnippet(() => ({
			render: () => '<button data-testid="field-control">Toggle</button>'
		}));

		const screen = await renderWithTestWrapper(SettingsField, {
			heading: 'Deletion method',
			value: 'unused',
			control
		});

		expect(screen.getByTestId('field-control')).toBeInTheDocument();
		expect(screen.getByText('unused').elements()).toHaveLength(0);
	});

	it('renders no trailing content when neither control nor value is provided', async () => {
		const screen = await renderWithTestWrapper(SettingsField, {
			heading: 'Info only',
			subheading: 'Just some text'
		});

		expect(screen.getByText('Info only')).toBeInTheDocument();
		expect(screen.getByText('Just some text')).toBeInTheDocument();
	});
});
