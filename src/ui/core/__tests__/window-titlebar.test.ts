import { createRawSnippet } from 'svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WindowTitlebar from '../window-titlebar.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const { isMacOS, watchWindowFullscreen, stopWatching } = vi.hoisted(() => ({
	isMacOS: vi.fn(() => true),
	watchWindowFullscreen: vi.fn(),
	stopWatching: vi.fn()
}));

vi.mock('$utils/is-macos', () => ({ isMacOS }));
vi.mock('$utils/watch-window-fullscreen', () => ({ watchWindowFullscreen }));

/** Stands in for the watcher, letting a test push a state at will. */
let emitFullscreen: (fullscreen: boolean) => void = () => {};

const children = createRawSnippet(() => ({
	render: () => '<button type="button">Collapse sidebar</button>'
}));

beforeEach(() => {
	isMacOS.mockReturnValue(true);
	watchWindowFullscreen.mockImplementation((onChange: (fullscreen: boolean) => void) => {
		emitFullscreen = onChange;
		onChange(false);
		return stopWatching;
	});
});

describe('WindowTitlebar', () => {
	it('draws the strip and its controls on macOS', async () => {
		const screen = await renderWithTestWrapper(WindowTitlebar, { children });

		expect(screen.getByTestId('window-titlebar')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();
	});

	it('marks the strip as a window drag region', async () => {
		const screen = await renderWithTestWrapper(WindowTitlebar, { children });

		expect(screen.getByTestId('window-titlebar')).toHaveAttribute('data-tauri-drag-region');
	});

	it('renders nothing off macOS, where the OS draws its own titlebar', async () => {
		isMacOS.mockReturnValue(false);

		const screen = await renderWithTestWrapper(WindowTitlebar, { children });

		expect(screen.getByTestId('window-titlebar')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /collapse sidebar/i })).not.toBeInTheDocument();
	});

	it('renders the strip with no controls passed', async () => {
		const screen = await renderWithTestWrapper(WindowTitlebar, {});

		expect(screen.getByTestId('window-titlebar')).toBeInTheDocument();
	});

	describe('the traffic-light inset', () => {
		it('is kept while the window is not fullscreen', async () => {
			const screen = await renderWithTestWrapper(WindowTitlebar, { children });

			await expect
				.element(screen.getByTestId('window-titlebar'))
				.toHaveAttribute('data-fullscreen', 'false');
		});

		it('is dropped when the window is already fullscreen on mount', async () => {
			watchWindowFullscreen.mockImplementation((onChange: (fullscreen: boolean) => void) => {
				onChange(true);
				return stopWatching;
			});

			const screen = await renderWithTestWrapper(WindowTitlebar, { children });

			await expect
				.element(screen.getByTestId('window-titlebar'))
				.toHaveAttribute('data-fullscreen', 'true');
		});

		it('is dropped on entering fullscreen', async () => {
			const screen = await renderWithTestWrapper(WindowTitlebar, { children });

			await expect
				.element(screen.getByTestId('window-titlebar'))
				.toHaveAttribute('data-fullscreen', 'false');

			emitFullscreen(true);

			await expect
				.element(screen.getByTestId('window-titlebar'))
				.toHaveAttribute('data-fullscreen', 'true');
		});

		it('comes back on leaving fullscreen', async () => {
			const screen = await renderWithTestWrapper(WindowTitlebar, { children });

			emitFullscreen(true);
			await expect
				.element(screen.getByTestId('window-titlebar'))
				.toHaveAttribute('data-fullscreen', 'true');

			emitFullscreen(false);

			await expect
				.element(screen.getByTestId('window-titlebar'))
				.toHaveAttribute('data-fullscreen', 'false');
		});

		it('stops watching once unmounted', async () => {
			const screen = await renderWithTestWrapper(WindowTitlebar, { children });

			await expect
				.element(screen.getByTestId('window-titlebar'))
				.toHaveAttribute('data-fullscreen', 'false');

			screen.unmount();

			expect(stopWatching).toHaveBeenCalled();
		});
	});
});
