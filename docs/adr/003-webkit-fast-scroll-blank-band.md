# ADR 003: Blank Band on Fast Scrolls Is WebKit's, Not Ours

## Status

Accepted (2026-10-30). Read this before trying to fix "a black/blank area
appears ahead of the scroll" in any list again.

## Context

On fast trackpad flicks or a free-spinning wheel, the virtualized branch list
(`src/domains/branch-management/components/branch-list.svelte`, pindoba
GridList with `virtual` + `scroll`) showed a black band on the side it was
scrolling towards. Earlier rounds treated it as a virtualization problem and
didn't fix it:

- row estimate matched to the measured height (90 → 67px)
- overscan 6 → 12 → 24 rows (~1,600px each side)
- skeleton rows painted into the spacers
- hover-only row actions to cut mount cost

### What the band actually is

WKWebView scrolls on its own scrolling thread, ahead of the main thread. New
tiles are only drawn when the main thread commits a frame. On a fast flick the
scroll outruns the drawn tiles, and an undrawn tile shows whatever sits
_behind_ the scroller. Our scroller was transparent, so that was the
near-black PageWell (`rgb(6, 10, 13)`).

The spacers' skeleton rows never showed, because a spacer is in the scrolled
content: it is only visible once its tile is drawn, which is the same moment
the real rows would be. More overscan cannot help either: the DOM was already
covering the viewport, and the tiles weren't drawn yet.

### How it was established

All tests ran in the real app through the debug WebDriver server (see
`webkit-profiling-webdriver` in the project memory) and in browsers on
macOS 26. "Red" means the scroller's background was set to red, so an undrawn
tile shows as a red band.

| Test                                                          | Band?                   |
| ------------------------------------------------------------- | ----------------------- |
| Branch list, red scroller background                          | Red band: undrawn tiles |
| Rows emptied (all content `visibility: hidden`)               | Same                    |
| Body `saturate()` filter and the grid's `scrollFadeEdges` off | Same                    |
| Also: Query Devtools button hidden, spinner animations off    | Same                    |
| Plain static box, 300 simple rows, no component, in the app   | Yes, somewhat less      |
| Same plain box in Safari                                      | Yes, somewhat less      |
| TanStack Virtual's own demo in Safari                         | Yes                     |
| Plain box and TanStack demo in Firefox                        | Never                   |
| Plain page that scrolls the document (no box), Safari and app | Only on extreme flicks  |
| The real branch view switched to document scroll, in the app  | Same as the box         |

A recording of a real flick in the dev build: the main thread presents a
frame every 28ms (median; p90 67ms, max 110ms), each frame jumps
1,000–1,500px, and the Svelte work per scroll event is 11ms median (max 41ms).
The rendered rows covered the viewport on nearly every frame. Mount cost makes
the band somewhat more frequent than in a plain box, but a plain box gets it
too, so cutting mount cost cannot remove it.

Public reports of the same family:
[tiez-clipboard #181](https://github.com/jimuzhe/tiez-clipboard/pull/181)
(a Tauri macOS list blanking on fast flings, attributed to `backdrop-filter` /
`clip-path` on scroll ancestors, which we don't have) and
[wry #1848](https://github.com/tauri-apps/wry/issues/1848) (WKWebView
presentation problems on macOS 26, open). WebKit does give overflow scrollers
speed-based tile coverage
([bug 198294](https://auto-bugs.webkit.org/show_bug.cgi?id=198294)), but in
practice it still falls behind.

## Decision

1. **Treat the band as WebKit behavior.** Don't spend more effort on
   overscan, row estimates, spacer painting or mount cost to remove it. Mount
   cost work may still be worth it for its own sake, but not as a fix for this.

2. **Mask it: give the scroll port an opaque, non-scrolling backdrop.** The
   port's own `background-color` stays behind its scrolled tiles, so an undrawn
   stretch shows the row fill (`var(--gl-row-bg)`) and reads as cards still
   loading instead of a black hole. In `branch-list.svelte`:
   - `passThrough.grid`: `backgroundColor: var(--gl-row-bg)`,
     `backgroundClip: content-box` (keeps it off the scrollbar gap),
     `isolation: isolate`.
   - The well colour between the cards is drawn _with_ the rows by the lead
     spacer's full-height sizer (`[data-grid-list-spacer-lead]::after`, made
     visible, full width, `z-index: -1`), so the list looks the same at rest.

3. **Don't move the app to document scrolling for this.** It helped plain
   pages but not the real branch view, and it would mean reworking the app
   shell and adding window scrolling to pindoba's GridList.

## Pitfalls found on the way

- **No `background-attachment: local` layer on the scroller.** It moves the
  _whole_ background, colour included, into the scrolled tiles, so the
  fallback never shows and the band stays black.
- Comparisons must use WebKit. The TanStack demo looked fine in Firefox and
  showed the same band in Safari.
- To confirm the symptom in another list: paint the scroller red over
  WebDriver and flick. A red band means undrawn tiles, and this ADR applies.
  Skeleton rows instead of red would mean the DOM window is behind, which is a
  real virtualization problem.

## Consequences

- On fast flicks, users see a stretch of plain card colour that fills in
  shortly after, instead of black.
- Other scroll lists (worktrees, cleanup, dialogs) will show the same band on
  fast flicks. The same backdrop technique applies; upstreaming it into
  pindoba's GridList `scroll` styles is the place to do it once for all of
  them.
- If WebKit improves overflow tile coverage, the mitigation becomes invisible.
  It doesn't need to be removed.
