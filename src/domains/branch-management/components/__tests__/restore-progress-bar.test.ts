import { describe, test, expect } from 'vitest';
import RestoreProgressBar from '../restore-progress-bar.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

describe('RestoreProgressBar', () => {
	test('renders processed/total text', () => {
		const screen = renderWithTestWrapper(RestoreProgressBar, {
			processed: 2,
			total: 5,
			progress: 40,
			estimatedTimeRemaining: '10 seconds',
			pendingConflicts: 0
		});
		expect(screen.getByTestId('progress-text')).toHaveTextContent('2 of 5 branches restored');
	});

	test('shows ETA when no pending conflicts', () => {
		const screen = renderWithTestWrapper(RestoreProgressBar, {
			processed: 2,
			total: 5,
			progress: 40,
			estimatedTimeRemaining: '10 seconds',
			pendingConflicts: 0
		});
		expect(screen.getByTestId('time-remaining')).toHaveTextContent(
			'Estimated time remaining: 10 seconds'
		);
	});

	test('hides ETA when conflicts are pending', () => {
		const screen = renderWithTestWrapper(RestoreProgressBar, {
			processed: 2,
			total: 5,
			progress: 40,
			estimatedTimeRemaining: '10 seconds',
			pendingConflicts: 1
		});
		const matches = screen.getByTestId('time-remaining').elements();
		expect(matches.length).toBe(0);
	});

	test('hides ETA when no estimate provided', () => {
		const screen = renderWithTestWrapper(RestoreProgressBar, {
			processed: 0,
			total: 5,
			progress: 0,
			estimatedTimeRemaining: null,
			pendingConflicts: 0
		});
		const matches = screen.getByTestId('time-remaining').elements();
		expect(matches.length).toBe(0);
	});
});
