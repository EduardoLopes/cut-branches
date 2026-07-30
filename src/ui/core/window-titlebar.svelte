<script lang="ts">
	import type { Snippet } from 'svelte';
	import { isMacOS } from '$utils/is-macos';
	import { watchWindowFullscreen } from '$utils/watch-window-fullscreen';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** Controls placed in the strip, immediately right of the traffic lights. */
		children?: Snippet;
	}

	const { children }: Props = $props();

	// Fullscreen hides the traffic lights, so the inset reserved for them becomes
	// dead space at the front of the strip.
	let fullscreen = $state(false);

	$effect(() => watchWindowFullscreen((next) => (fullscreen = next)));

	// macOS only. The window sets `titleBarStyle: "Overlay"` there, so the
	// webview extends under the titlebar and this strip is the only thing drawn
	// in that band. Every other platform keeps its OS-drawn titlebar above the
	// webview, where there is nothing for us to draw into.
	const macOS = isMacOS();
</script>

{#if macOS}
	<!-- `data-tauri-drag-region` keeps the band behaving like a titlebar: drag
	     to move the window, double-click to zoom. Interactive children opt out
	     of it simply by being on top — Tauri only treats the attributed element
	     itself as the drag surface, not its descendants. -->
	<div
		data-tauri-drag-region
		data-testid="window-titlebar"
		data-fullscreen={fullscreen}
		class={css({
			display: 'flex',
			alignItems: 'center',
			gap: '3xs',
			flexShrink: 0,
			// `titleBarStyle: "Overlay"` makes the native titlebar transparent and
			// runs the webview underneath it, so this strip's own background IS the
			// titlebar's colour — a semantic token here means the titlebar follows
			// light/dark mode with everything else. It matches the sidebar surface so
			// the two read as one continuous piece of chrome.
			background: 'neutral.surface.soft',
			borderBottomWidth: '1px',
			borderBottomStyle: 'solid',
			borderBottomColor: 'neutral.border.muted',
			// The band's depth, measured in devtools against the real window — the
			// native titlebar is deeper than the row of traffic lights sitting in it.
			// Controls centre in that depth (see `alignItems` above) rather than
			// being pinned to the lights' own axis; at this height the two read as
			// level anyway, and centring means the strip stays correct if a control
			// changes size.
			minHeight: '3.2rem',
			// The three lights run x=20 to x≈72, spaced 8px apart. Continue that same
			// rhythm rather than opening a wider gap: 7.6rem puts the control's box
			// 4px past the green button, which lands its *glyph* — inset inside the
			// affix — about 8px away, matching the spacing between the lights
			// themselves so the toggle reads as a fourth item in their row.
			paddingLeft: '7.6rem',
			// Fullscreen takes the traffic lights away, so the strip reclaims their
			// inset and the controls start at the window edge like any other row.
			'&[data-fullscreen="true"]': { paddingLeft: 'xs' },
			paddingRight: 'xs'
		})}
	>
		{@render children?.()}
	</div>
{/if}
