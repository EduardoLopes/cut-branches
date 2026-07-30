import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { watchWindowFullscreen } from '../watch-window-fullscreen';

const { isFullscreen, getCurrentWindow } = vi.hoisted(() => {
	const isFullscreen = vi.fn(() => Promise.resolve(false));
	return { isFullscreen, getCurrentWindow: vi.fn(() => ({ isFullscreen })) };
});

vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow }));

/** Lets the settle ladder run to completion. */
function afterSettle() {
	return new Promise((resolve) => setTimeout(resolve, 1800));
}

let stop: () => void = () => {};

beforeEach(() => {
	isFullscreen.mockResolvedValue(false);
	getCurrentWindow.mockReturnValue({ isFullscreen });
});

afterEach(() => {
	stop();
});

describe('watchWindowFullscreen', () => {
	it('reports the current state immediately', async () => {
		isFullscreen.mockResolvedValue(true);
		const onChange = vi.fn();

		stop = watchWindowFullscreen(onChange);

		await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith(true));
	});

	it('reports entering fullscreen', async () => {
		const onChange = vi.fn();
		stop = watchWindowFullscreen(onChange);
		await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith(false));

		isFullscreen.mockResolvedValue(true);
		window.dispatchEvent(new Event('resize'));

		await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith(true));
	});

	it('reports leaving fullscreen even when the flag clears late', async () => {
		isFullscreen.mockResolvedValue(true);
		const onChange = vi.fn();
		stop = watchWindowFullscreen(onChange);
		await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith(true));

		// The first reads after the resize still return the pre-transition value —
		// only a later rung of the ladder sees the cleared flag.
		isFullscreen.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValue(false);
		window.dispatchEvent(new Event('resize'));

		await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith(false));
	});

	it('notifies once per actual change, not once per read', async () => {
		const onChange = vi.fn();
		stop = watchWindowFullscreen(onChange);
		await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith(false));
		onChange.mockClear();

		// Every rung reads the same value, so there is nothing new to report.
		window.dispatchEvent(new Event('resize'));
		await afterSettle();

		expect(onChange).not.toHaveBeenCalled();
	});

	it('stops reading once cleaned up', async () => {
		const onChange = vi.fn();
		stop = watchWindowFullscreen(onChange);
		await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith(false));

		stop();
		isFullscreen.mockClear();
		window.dispatchEvent(new Event('resize'));
		await afterSettle();

		expect(isFullscreen).not.toHaveBeenCalled();
	});

	it('reports windowed when there is no Tauri host', () => {
		getCurrentWindow.mockImplementation(() => {
			throw new Error('not a Tauri window');
		});
		const onChange = vi.fn();

		stop = watchWindowFullscreen(onChange);

		expect(onChange).toHaveBeenCalledWith(false);
	});
});
