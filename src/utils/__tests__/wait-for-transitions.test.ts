import { afterEach, describe, expect, it } from 'vitest';
import { waitForTransitions } from '../wait-for-transitions';

function mount(html: string) {
	const host = document.createElement('div');
	host.innerHTML = html;
	document.body.append(host);
	return host;
}

async function elapsed(promise: Promise<void>) {
	const start = performance.now();
	await promise;
	return performance.now() - start;
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('waitForTransitions', () => {
	it('waits for the longest transition inside the element, delay included', async () => {
		const host = mount(
			'<span style="transition: color 50ms"></span><span style="transition: opacity 0.1s 0.05s"></span>'
		);

		expect(await elapsed(waitForTransitions(host))).toBeGreaterThanOrEqual(140);
	});

	it('counts a transition on a pseudo-element', async () => {
		const style = document.createElement('style');
		style.textContent = '.thumb::before { content: ""; transition: translate 120ms; }';
		document.head.append(style);
		const host = mount('<div class="thumb"></div>');

		expect(await elapsed(waitForTransitions(host))).toBeGreaterThanOrEqual(110);
		style.remove();
	});

	it('repeats the delay list over the durations', async () => {
		// One delay, two durations: the 80ms delay applies to both.
		const host = mount(
			'<span style="transition-property: color, opacity; transition-duration: 20ms, 20ms; transition-delay: 80ms"></span>'
		);

		expect(await elapsed(waitForTransitions(host))).toBeGreaterThanOrEqual(90);
	});

	it('never waits longer than the cap', async () => {
		const host = mount('<span style="transition: color 5s"></span>');

		expect(await elapsed(waitForTransitions(host, 60))).toBeLessThan(1000);
	});

	it('only waits a frame when nothing transitions', async () => {
		const host = mount('<span></span>');

		expect(await elapsed(waitForTransitions(host))).toBeLessThan(100);
	});
});
