import { describe, expect, it, vi } from 'vitest';
import ExplanationPanel from '../explanation-panel.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

describe('ExplanationPanel', () => {
	it('offers an Explain action when idle and reports clicks', async () => {
		const onExplain = vi.fn();
		const screen = renderWithTestWrapper(ExplanationPanel, { status: 'idle', onExplain });

		const button = screen.getByTestId('explanation-explain');
		await expect.element(button).toHaveTextContent('Explain this change');
		await button.click();
		expect(onExplain).toHaveBeenCalledOnce();
	});

	it('always makes the agent-cost transparent', async () => {
		const screen = renderWithTestWrapper(ExplanationPanel, { status: 'idle', onExplain: vi.fn() });
		await expect.element(screen.getByText("Uses your agent's quota")).toBeInTheDocument();
	});

	it('shows the streaming text and a working cancel button', async () => {
		const onCancel = vi.fn();
		const screen = renderWithTestWrapper(ExplanationPanel, {
			status: 'streaming',
			text: 'partial…',
			onExplain: vi.fn(),
			onCancel
		});

		await expect.element(screen.getByTestId('explanation-loading')).toBeInTheDocument();
		await expect.element(screen.getByTestId('explanation-text')).toHaveTextContent('partial…');
		await screen.getByTestId('explanation-cancel').click();
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it('omits the cancel button when no cancel handler is given', async () => {
		const screen = renderWithTestWrapper(ExplanationPanel, {
			status: 'streaming',
			onExplain: vi.fn()
		});
		await expect.element(screen.getByTestId('explanation-loading')).toBeInTheDocument();
		expect(screen.container.querySelector('[data-testid="explanation-cancel"]')).toBeNull();
	});

	it('renders the finished text with a Regenerate action', async () => {
		const screen = renderWithTestWrapper(ExplanationPanel, {
			status: 'done',
			text: 'This change renames a helper.',
			onExplain: vi.fn()
		});
		await expect
			.element(screen.getByTestId('explanation-text'))
			.toHaveTextContent('This change renames a helper.');
		await expect.element(screen.getByTestId('explanation-explain')).toHaveTextContent('Regenerate');
	});

	it('surfaces the failure message on error', async () => {
		const screen = renderWithTestWrapper(ExplanationPanel, {
			status: 'error',
			error: 'agent exited 1',
			onExplain: vi.fn()
		});
		await expect
			.element(screen.getByTestId('explanation-error'))
			.toHaveTextContent('agent exited 1');
	});

	it('falls back to a generic error when none is provided', async () => {
		const screen = renderWithTestWrapper(ExplanationPanel, {
			status: 'error',
			error: null,
			onExplain: vi.fn()
		});
		await expect
			.element(screen.getByTestId('explanation-error'))
			.toHaveTextContent('Explanation failed');
	});

	it('notes a cancellation that produced no text', async () => {
		const screen = renderWithTestWrapper(ExplanationPanel, {
			status: 'cancelled',
			onExplain: vi.fn()
		});
		await expect
			.element(screen.getByTestId('explanation-cancelled'))
			.toHaveTextContent('Explanation cancelled.');
	});

	it('keeps partial text after cancellation without the empty-cancel note', async () => {
		const screen = renderWithTestWrapper(ExplanationPanel, {
			status: 'cancelled',
			text: 'half an explanation',
			onExplain: vi.fn()
		});
		await expect
			.element(screen.getByTestId('explanation-text'))
			.toHaveTextContent('half an explanation');
		expect(screen.container.querySelector('[data-testid="explanation-cancelled"]')).toBeNull();
	});

	it('points to the inline comments in per-change mode instead of listing text', async () => {
		const screen = renderWithTestWrapper(ExplanationPanel, {
			status: 'done',
			granularity: 'hunks',
			text: '@@HUNK 1@@\nRenames the helper.',
			onExplain: vi.fn()
		});
		await expect.element(screen.getByTestId('explanation-inline-hint')).toBeInTheDocument();
		// The per-change text lives inline in the diff, not in the panel body.
		expect(screen.container.querySelector('[data-testid="explanation-text"]')).toBeNull();
	});

	it('shows no inline hint until a per-change explanation has started', async () => {
		const screen = renderWithTestWrapper(ExplanationPanel, {
			status: 'idle',
			granularity: 'hunks',
			onExplain: vi.fn()
		});
		expect(screen.container.querySelector('[data-testid="explanation-inline-hint"]')).toBeNull();
	});
});
