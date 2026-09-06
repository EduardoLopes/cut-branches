import { describe, test, expect, vi, beforeEach } from 'vitest';
import { getAppInfo } from '../get-app-info';

const mocks = vi.hoisted(() => ({
	getName: vi.fn(),
	getVersion: vi.fn(),
	getIdentifier: vi.fn(),
	getTauriVersion: vi.fn(),
	platform: vi.fn(),
	version: vi.fn(),
	arch: vi.fn()
}));

vi.mock('@tauri-apps/api/app', () => ({
	getName: mocks.getName,
	getVersion: mocks.getVersion,
	getIdentifier: mocks.getIdentifier,
	getTauriVersion: mocks.getTauriVersion
}));

vi.mock('@tauri-apps/plugin-os', () => ({
	platform: mocks.platform,
	version: mocks.version,
	arch: mocks.arch
}));

beforeEach(() => {
	vi.clearAllMocks();
});

describe('getAppInfo', () => {
	test('resolves the app, Tauri and host OS details', async () => {
		mocks.getName.mockResolvedValue('Cut Branches');
		mocks.getVersion.mockResolvedValue('1.4.2');
		mocks.getIdentifier.mockResolvedValue('com.cut-branches.app');
		mocks.getTauriVersion.mockResolvedValue('2.9.0');
		mocks.platform.mockReturnValue('macos');
		mocks.version.mockReturnValue('15.4');
		mocks.arch.mockReturnValue('aarch64');

		await expect(getAppInfo()).resolves.toEqual({
			appName: 'Cut Branches',
			appVersion: '1.4.2',
			appIdentifier: 'com.cut-branches.app',
			tauriVersion: '2.9.0',
			osPlatform: 'macos',
			osVersion: '15.4',
			osArch: 'aarch64'
		});
	});
});
