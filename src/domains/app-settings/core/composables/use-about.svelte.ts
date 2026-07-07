import { appLogDir } from '@tauri-apps/api/path';
import { openPath, openUrl } from '@tauri-apps/plugin-opener';
import { getAppInfo } from '../../infrastructure/get-app-info';
import { notifications } from '$services/notifications/notifications.svelte';

/** Canonical project home. Issue/release URLs are derived from it. */
const REPO_URL = 'https://github.com/EduardoLopes/cut-branches';

export interface AboutLink {
	id: string;
	label: string;
	icon: string;
	url: string;
}

/** Friendly display names for the platform identifiers `plugin-os` reports. */
const OS_LABELS: Record<string, string> = {
	macos: 'macOS',
	windows: 'Windows',
	linux: 'Linux',
	ios: 'iOS',
	android: 'Android'
};

/**
 * Application logic backing the About page: exposes the app/Tauri versions and
 * the external actions (open a link, copy diagnostics, reveal the logs folder).
 * Kept transport- and UI-agnostic so the panel only renders what it returns.
 */
export function useAbout() {
	let appName = $state('Cut Branches');
	let appVersion = $state(__APP_VERSION__);
	let appIdentifier = $state('unknown');
	let tauriVersion = $state('Unknown');
	let osPlatform = $state('unknown');
	let osVersion = $state('');
	let osArch = $state('');

	// Build-time metadata (injected by Vite `define`) and the current locale need
	// no runtime lookup — they are the same for the lifetime of the window.
	const commit = __APP_COMMIT__;
	const buildDate = __BUILD_DATE__.split('T')[0];
	const locale = navigator.language;

	// Enrich with the live runtime values once the Tauri API answers. Falls
	// back silently to the build-time constants when running outside Tauri
	// (e.g. the browser test runner), so the UI always has something to show.
	getAppInfo()
		.then((info) => {
			appName = info.appName;
			appVersion = info.appVersion;
			appIdentifier = info.appIdentifier;
			tauriVersion = info.tauriVersion;
			osPlatform = info.osPlatform;
			osVersion = info.osVersion;
			osArch = info.osArch;
		})
		.catch(() => {
			/* Not running inside Tauri — keep the fallback values. */
		});

	function osSummary() {
		const label = OS_LABELS[osPlatform] ?? osPlatform;
		return `${label} ${osVersion} (${osArch})`;
	}

	const links: AboutLink[] = [
		{ id: 'repo', label: 'GitHub', icon: 'lucide:github', url: REPO_URL },
		{ id: 'issue', label: 'Report an issue', icon: 'lucide:bug', url: `${REPO_URL}/issues/new` },
		{ id: 'releases', label: 'Releases', icon: 'lucide:tag', url: `${REPO_URL}/releases` }
	];

	async function openLink(url: string) {
		try {
			await openUrl(url);
		} catch (error) {
			notifications.push({
				title: 'Could not open link',
				message: 'Failed to open the link in your browser',
				feedback: 'danger'
			});
			console.error('openUrl failed', error);
		}
	}

	async function openLogsFolder() {
		try {
			await openPath(await appLogDir());
		} catch (error) {
			notifications.push({
				title: 'Could not open logs',
				message: 'Failed to open the logs folder',
				feedback: 'danger'
			});
			console.error('openLogsFolder failed', error);
		}
	}

	async function copyDiagnostics() {
		const diagnostics = [
			`${appName} v${appVersion} (${commit})`,
			`Identifier: ${appIdentifier}`,
			`OS: ${osSummary()}`,
			`Tauri: ${tauriVersion}`,
			`Locale: ${locale}`,
			`Built: ${buildDate}`,
			`User agent: ${navigator.userAgent}`
		].join('\n');

		try {
			await navigator.clipboard.writeText(diagnostics);
			notifications.push({
				title: 'Diagnostics copied',
				message: 'Version details were copied to your clipboard',
				feedback: 'success'
			});
		} catch (error) {
			notifications.push({
				title: 'Could not copy',
				message: 'Failed to copy diagnostics to the clipboard',
				feedback: 'danger'
			});
			console.error('clipboard write failed', error);
		}
	}

	return {
		get appVersion() {
			return appVersion;
		},
		get appIdentifier() {
			return appIdentifier;
		},
		get tauriVersion() {
			return tauriVersion;
		},
		get osSummary() {
			return osSummary();
		},
		get locale() {
			return locale;
		},
		get build() {
			return `${commit} · ${buildDate}`;
		},
		links,
		openLink,
		openLogsFolder,
		copyDiagnostics
	};
}
