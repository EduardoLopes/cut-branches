import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AboutLink } from '../../core/composables/use-about.svelte';
import AboutPanel from '../about-panel.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const LINKS: AboutLink[] = [
	{ id: 'repo', label: 'GitHub', icon: 'lucide:github', url: 'https://example.com/repo' },
	{ id: 'issue', label: 'Report an issue', icon: 'lucide:bug', url: 'https://example.com/issue' },
	{ id: 'releases', label: 'Releases', icon: 'lucide:tag', url: 'https://example.com/releases' }
];

const h = vi.hoisted(() => ({
	openLink: vi.fn(),
	openLogsFolder: vi.fn(),
	copyDiagnostics: vi.fn()
}));

vi.mock('../../core/composables/use-about.svelte', () => ({
	useAbout: () => ({
		appVersion: '1.2.3',
		appIdentifier: 'com.cut-branches.app',
		tauriVersion: '2.9.0',
		osSummary: 'macOS 15.4 (aarch64)',
		locale: 'en-US',
		build: 'abc1234 · 2026-07-06',
		links: LINKS,
		openLink: h.openLink,
		openLogsFolder: h.openLogsFolder,
		copyDiagnostics: h.copyDiagnostics
	})
}));

beforeEach(() => {
	vi.clearAllMocks();
});

describe('AboutPanel', () => {
	it('renders the app, OS, build and locale info rows', async () => {
		const screen = await renderWithTestWrapper(AboutPanel);

		expect(screen.getByText('App version')).toBeInTheDocument();
		expect(screen.getByText('Operating system')).toBeInTheDocument();
		expect(screen.getByText('macOS 15.4 (aarch64)')).toBeInTheDocument();
		expect(screen.getByText('Build')).toBeInTheDocument();
		expect(screen.getByText('Locale')).toBeInTheDocument();
		expect(screen.getByText('Identifier')).toBeInTheDocument();
	});

	it('renders a button per external link', async () => {
		const screen = await renderWithTestWrapper(AboutPanel);

		expect(screen.getByTestId('about-link-repo')).toBeInTheDocument();
		expect(screen.getByTestId('about-link-issue')).toBeInTheDocument();
		expect(screen.getByTestId('about-link-releases')).toBeInTheDocument();
	});

	it('opens a link when its button is clicked', async () => {
		const screen = await renderWithTestWrapper(AboutPanel);

		await screen.getByTestId('about-link-repo').click();

		expect(h.openLink).toHaveBeenCalledWith('https://example.com/repo');
	});

	it('copies diagnostics from the copy button', async () => {
		const screen = await renderWithTestWrapper(AboutPanel);

		await screen.getByTestId('about-copy-diagnostics').click();

		expect(h.copyDiagnostics).toHaveBeenCalled();
	});

	it('opens the logs folder from its button', async () => {
		const screen = await renderWithTestWrapper(AboutPanel);

		await screen.getByTestId('about-open-logs').click();

		expect(h.openLogsFolder).toHaveBeenCalled();
	});
});
