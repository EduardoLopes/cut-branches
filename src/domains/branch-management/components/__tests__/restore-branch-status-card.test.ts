import { describe, test, expect, vi } from 'vitest';
import { Branch } from '../../core/models/branch';
import RestoreBranchStatusCard from '../restore-branch-status-card.svelte';
import type { Branch as BranchData, RestoreBranchResult } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

const validSha = 'abc1234567890abc1234567890abc1234567890a';

function makeBranch(name: string): Branch {
	const data: BranchData = {
		name,
		current: false,
		upstream: null,
		lastCommit: {
			sha: validSha,
			shortSha: validSha.slice(0, 7),
			date: '2024-01-01',
			message: 'm',
			summary: 'm',
			author: 'a',
			email: 'a@example.com'
		},
		fullyMerged: false,
		deletedAt: null,
		isReachable: null,
		isSelected: false,
		isLocked: false
	};
	return Branch.fromData(data);
}

function successResult(name: string): RestoreBranchResult {
	return {
		branchName: name,
		success: true,
		skipped: false,
		requiresUserAction: false,
		message: '',
		conflictDetails: null,
		branch: null
	};
}

function skippedResult(name: string): RestoreBranchResult {
	return { ...successResult(name), success: false, skipped: true, message: '' };
}

const baseProps = {
	isPending: false,
	isCurrentConflict: false,
	isInFlight: false,
	existsAlready: false,
	preference: undefined,
	isProcessing: false,
	onSetPreference: () => {}
};

describe('RestoreBranchStatusCard', () => {
	test('shows pre-resolution buttons when branch already exists and not processing', async () => {
		const screen = await renderWithTestWrapper(RestoreBranchStatusCard, {
			...baseProps,
			branch: makeBranch('feat-x'),
			result: undefined,
			existsAlready: true
		});
		expect(screen.getByTestId('branch-conflict-warning')).toBeInTheDocument();
		expect(screen.getByTestId('pre-skip-button')).toBeInTheDocument();
		expect(screen.getByTestId('pre-overwrite-button')).toBeInTheDocument();
	});

	test('hides pre-resolution buttons when isProcessing', async () => {
		const screen = await renderWithTestWrapper(RestoreBranchStatusCard, {
			...baseProps,
			branch: makeBranch('feat-x'),
			result: undefined,
			existsAlready: true,
			isProcessing: true
		});
		expect(screen.getByTestId('branch-conflict-warning').elements().length).toBe(0);
	});

	test('clicking pre-skip calls onSetPreference with Skip', async () => {
		const onSetPreference = vi.fn();
		const screen = await renderWithTestWrapper(RestoreBranchStatusCard, {
			...baseProps,
			branch: makeBranch('feat-x'),
			result: undefined,
			existsAlready: true,
			onSetPreference
		});
		await screen.getByTestId('pre-skip-button').click();
		expect(onSetPreference).toHaveBeenCalledWith('Skip');
	});

	test('renders Skipped label when result is skipped', async () => {
		const screen = await renderWithTestWrapper(RestoreBranchStatusCard, {
			...baseProps,
			branch: makeBranch('feat-x'),
			result: skippedResult('feat-x')
		});
		expect(screen.getByText('Skipped')).toBeInTheDocument();
	});

	test('shows "Waiting for user resolution..." when pending and not current', async () => {
		const screen = await renderWithTestWrapper(RestoreBranchStatusCard, {
			...baseProps,
			branch: makeBranch('feat-x'),
			result: undefined,
			isPending: true,
			isProcessing: true
		});
		expect(screen.getByText('Waiting for user resolution...')).toBeInTheDocument();
	});

	test('hides pre-resolution buttons while a mutation is in flight for this branch', async () => {
		// isInFlight is the signal that conflict resolution is currently being
		// applied — even outside the explicit isProcessing batch state we should
		// not let the user re-pick a preference for this row.
		const screen = await renderWithTestWrapper(RestoreBranchStatusCard, {
			...baseProps,
			branch: makeBranch('feat-x'),
			result: successResult('feat-x'),
			existsAlready: true,
			isInFlight: true,
			isProcessing: true
		});
		expect(screen.getByTestId('branch-conflict-warning').elements().length).toBe(0);
	});
});
