import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAbout } from '../use-about.svelte';

const mocks = vi.hoisted(() => ({
	getAppInfo: vi.fn(),
	openUrl: vi.fn(),
	openPath: vi.fn(),
	appLogDir: vi.fn(),
	push: vi.fn()
}));

vi.mock('../../../infrastructure/get-app-info', () => ({
	getAppInfo: mocks.getAppInfo
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
	openUrl: mocks.openUrl,
	openPath: mocks.openPath
}));

vi.mock('@tauri-apps/api/path', () => ({
	appLogDir: mocks.appLogDir
}));

vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: { push: mocks.push }
}));

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	vi.clearAllMocks();
	mocks.getAppInfo.mockResolvedValue({
		appName: 'Cut Branches',
		appVersion: '9.9.9',
		appIdentifier: 'com.cut-branches.app',
		tauriVersion: '2.9.0',
		osPlatform: 'macos',
		osVersion: '15.4',
		osArch: 'aarch64'
	});
	mocks.openUrl.mockResolvedValue(undefined);
	mocks.openPath.mockResolvedValue(undefined);
	mocks.appLogDir.mockResolvedValue('/logs/cut-branches');
	consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	consoleError.mockRestore();
});

describe('useAbout', () => {
	test('loads the live app, Tauri and OS details', async () => {
		const about = useAbout();

		await vi.waitFor(() => expect(about.appVersion).toBe('9.9.9'));
		expect(about.tauriVersion).toBe('2.9.0');
		expect(about.appIdentifier).toBe('com.cut-branches.app');
		expect(about.osSummary).toBe('macOS 15.4 (aarch64)');
	});

	test('falls back to the raw platform id for unknown systems', async () => {
		mocks.getAppInfo.mockResolvedValueOnce({
			appName: 'Cut Branches',
			appVersion: '9.9.9',
			appIdentifier: 'com.cut-branches.app',
			tauriVersion: '2.9.0',
			osPlatform: 'freebsd',
			osVersion: '14',
			osArch: 'x86_64'
		});
		const about = useAbout();

		await vi.waitFor(() => expect(about.osSummary).toBe('freebsd 14 (x86_64)'));
	});

	test('exposes the build metadata and locale', () => {
		const about = useAbout();

		// commit · date, both injected by Vite `define`.
		expect(about.build).toMatch(/ · \d{4}-\d{2}-\d{2}$/);
		expect(about.locale).toBe(navigator.language);
	});

	test('keeps fallback versions when the runtime is unavailable', async () => {
		mocks.getAppInfo.mockRejectedValueOnce(new Error('not in Tauri'));

		const about = useAbout();

		// Give the rejected promise a chance to settle without changing state.
		await Promise.resolve();
		expect(about.tauriVersion).toBe('Unknown');
	});

	test('derives the GitHub, issue and release links', () => {
		const about = useAbout();

		expect(about.links.map((link) => link.id)).toEqual(['repo', 'issue', 'releases']);
		expect(about.links.find((link) => link.id === 'issue')?.url).toContain('/issues/new');
		expect(about.links.find((link) => link.id === 'releases')?.url).toContain('/releases');
	});

	describe('openLink', () => {
		test('opens the url in the system browser', async () => {
			const about = useAbout();

			await about.openLink('https://example.com');

			expect(mocks.openUrl).toHaveBeenCalledWith('https://example.com');
			expect(mocks.push).not.toHaveBeenCalled();
		});

		test('notifies when opening the url fails', async () => {
			mocks.openUrl.mockRejectedValueOnce(new Error('boom'));
			const about = useAbout();

			await about.openLink('https://example.com');

			expect(mocks.push).toHaveBeenCalledWith(
				expect.objectContaining({ feedback: 'danger', title: 'Could not open link' })
			);
		});
	});

	describe('openLogsFolder', () => {
		test('opens the resolved log directory', async () => {
			const about = useAbout();

			await about.openLogsFolder();

			expect(mocks.openPath).toHaveBeenCalledWith('/logs/cut-branches');
			expect(mocks.push).not.toHaveBeenCalled();
		});

		test('notifies when opening the logs folder fails', async () => {
			mocks.openPath.mockRejectedValueOnce(new Error('boom'));
			const about = useAbout();

			await about.openLogsFolder();

			expect(mocks.push).toHaveBeenCalledWith(
				expect.objectContaining({ feedback: 'danger', title: 'Could not open logs' })
			);
		});
	});

	describe('copyDiagnostics', () => {
		test('copies version details to the clipboard and confirms', async () => {
			const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
			const about = useAbout();
			await vi.waitFor(() => expect(about.appVersion).toBe('9.9.9'));

			await about.copyDiagnostics();

			expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Cut Branches v9.9.9'));
			expect(writeText).toHaveBeenCalledWith(
				expect.stringContaining('Identifier: com.cut-branches.app')
			);
			expect(writeText).toHaveBeenCalledWith(expect.stringContaining('OS: macOS 15.4 (aarch64)'));
			expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Tauri: 2.9.0'));
			expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Locale:'));
			expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Built:'));
			expect(writeText).toHaveBeenCalledWith(expect.stringContaining('User agent:'));
			expect(mocks.push).toHaveBeenCalledWith(
				expect.objectContaining({ feedback: 'success', title: 'Diagnostics copied' })
			);
			writeText.mockRestore();
		});

		test('notifies when the clipboard write fails', async () => {
			const writeText = vi
				.spyOn(navigator.clipboard, 'writeText')
				.mockRejectedValue(new Error('denied'));
			const about = useAbout();

			await about.copyDiagnostics();

			expect(mocks.push).toHaveBeenCalledWith(
				expect.objectContaining({ feedback: 'danger', title: 'Could not copy' })
			);
			writeText.mockRestore();
		});
	});
});
