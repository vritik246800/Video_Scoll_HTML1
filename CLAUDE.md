# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-page scroll-driven visual essay ("Arquitetura da Casa") in Portuguese. Scrolling scrubs two background videos frame-by-frame while sequentially revealing 12 glass-morphism content scenes. No build step, no dependencies, no package manager — open `index.html` directly in a browser.

## Development

```bash
open index.html
# or serve with a static server to avoid CORS issues with video:
python3 -m http.server 8080
```

## Architecture

All logic lives in three files:

- **`index.html`** — 12 `.scene` divs split into two groups:
  - **House scenes (0–5)**: no `data-section` attribute, drive `house.mp4`.
  - **Vibe scenes (6–11)**: `data-section="vibe"`, drive `vibes.mp4`.
  - Scene 3 / Scene 9 have two `.card.glass` siblings (side-by-side). Scene 4 / Scene 10 use `.card-line` + `.card` (horizontal rule + body).
  - Each scene has `data-from` / `data-to` attributes defining its active range in **local progress** (0–1 within its own video half), not global scroll progress.

- **`script.js`** — Three independent concerns:
  1. `updateFromScroll()` (fired on `scroll`) computes `overall` progress (0–1 over the full 1400vh), derives `houseProgress` (first 50%) and `vibeProgress` (second 50%), and triggers lazy-loading of `video2` when `overall >= PRELOAD_AT`.
  2. `videoLoop()` (RAF loop) runs two parallel seek-smoothers — one per video — interpolating `currentTime` toward `targetTime` with `SMOOTHING`. **The loop self-suspends** when both videos converge (`|diff| < 0.001s`) and is restarted by `startRaf()` on each scroll event.  Seeks are gated by `isSeeking` / `isSeeking2` flags. `video2` seeks are skipped entirely until `video2Loaded` is true.
  3. `updateCrossfade()` — at `overall ≈ SPLIT (0.5)`, fades `video2` opacity from 0→1 and simultaneously fades all house scenes out and vibe scenes in.

- **`style.css`** — `.scene .glass` and `.scene .card-line` are invisible by default (`opacity 0`, translated off-screen, `clip-path: polygon(0 0, 0 0, 0 100%, 0 100%)`). Adding `.active` resets transforms and opens `clip-path` to a full rectangle — the asymmetric cubic-bezier transition (`0.22, 1, 0.36, 1`) animates the reveal. Scene-specific entry directions are defined per `.scene-N .glass` rule.

## Key Constants (script.js)

| Constant | Value | Effect |
|---|---|---|
| `FPS` | 30 | Must match video frame rate |
| `SMOOTHING` | 0.18 | Higher = snappier seek response; lower = smoother/slower |
| `SPLIT` | 0.5 | Overall scroll progress where `house.mp4` ends and `vibes.mp4` begins |
| `FADE_BAND` | 0.025 | Half-width of the crossfade zone (±2.5% around `SPLIT`) |
| `PRELOAD_AT` | 0.42 | Overall progress at which `video2` begins loading (`SPLIT - 0.08`) |

## Video Performance

`house.mp4` uses `preload="auto"`. `video2` (`vibes.mp4`) uses `preload="none"` and is loaded lazily as the user approaches `PRELOAD_AT`. This halves initial I/O load.

The largest factor in seek lag is the **GOP size** of the MP4. Re-encode with a 1-frame keyframe interval for near-instant seeks:

```bash
ffmpeg -i house.mp4 -g 1 -vcodec libx264 -crf 23 -preset fast house_scrub.mp4
ffmpeg -i vibes.mp4 -g 1 -vcodec libx264 -crf 23 -preset fast vibes_scrub.mp4
```

## Adding a New Scene

1. Add a `.scene.scene-N` div in `index.html` with `data-from` / `data-to` in **local 0–1 space** (redistribute existing ranges in that half).
2. For vibe scenes, add `data-section="vibe"`. House scenes need no attribute.
3. Add an entry-direction transform in `style.css` under `.scene-N .glass` (or `.card:nth-child`).
4. Add layout positioning rules (`.scene-N { align-items: ...; justify-content: ...; }`).
5. The counter (`01 / 12`) updates automatically from `houseScenes.length + vibeScenes.length`.

## Scene Variants

| Variant | HTML pattern |
|---|---|
| Single glass card | `<div class="card glass">` |
| Two glass cards (side-by-side) | Two `.card.glass` siblings directly in `.scene` |
| Card-line + card | `<div class="card-line">` then `<div class="card glass">` |

## Notes

- `#progress-bar` is defined in `script.js` but its CSS rule is commented out in `style.css` — it exists in the DOM but is invisible.
- `video.playbackRate = 0` is set on `loadedmetadata` to prevent autoplay from advancing the video.
- Both videos must be `muted` and `playsinline` to satisfy browser autoplay policies.
