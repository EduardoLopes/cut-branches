import { getIdentifier, getName, getTauriVersion, getVersion } from '@tauri-apps/api/app';
import { arch, platform, version } from '@tauri-apps/plugin-os';

export interface AppInfo {
	/** The product name (from `tauri.conf.json`). */
	appName: string;
	/** The packaged application version (from `tauri.conf.json` / `Cargo.toml`). */
	appVersion: string;
	/** The bundle identifier (e.g. `com.cut-branches.app`). */
	appIdentifier: string;
	/** The Tauri framework version the app was built against. */
	tauriVersion: string;
	/** The host operating system (`macos`, `windows`, `linux`, …). */
	osPlatform: string;
	/** The host OS version string. */
	osVersion: string;
	/** The CPU architecture (`aarch64`, `x86_64`, …). */
	osArch: string;
}

/**
 * Infrastructure adapter over the Tauri runtime: reads the packaged app, Tauri
 * framework and host OS details. Delivery/application code consumes this instead
 * of importing the Tauri API directly, keeping the transport at the boundary.
 */
export async function getAppInfo(): Promise<AppInfo> {
	const [appName, appVersion, appIdentifier, tauriVersion] = await Promise.all([
		getName(),
		getVersion(),
		getIdentifier(),
		getTauriVersion()
	]);

	// `plugin-os` values are injected synchronously at startup — no IPC needed.
	return {
		appName,
		appVersion,
		appIdentifier,
		tauriVersion,
		osPlatform: platform(),
		osVersion: version(),
		osArch: arch()
	};
}
