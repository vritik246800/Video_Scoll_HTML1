# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-page scroll-driven visual essay ("Arquitetura da Casa") in Portuguese. Scrolling scrubs a background video (`house.mp4`) frame-by-frame while sequentially revealing 6 glass-morphism content scenes. No build step, no dependencies, no package manager — open `index.html` directly in a browser.

## Development

Open locally:
```bash
open index.html
# or serve with any static server to avoid CORS issues with video:
python3 -m http.server 8080
```

## Architecture

All logic lives in three files:

- **`index.html`** — 6 `.scene` divs, each with `data-from` / `data-to` attributes (0–1 scroll progress range). Scene 3 has two `.card.glass` siblings; Scene 4 uses `.card-line` + `.card`.
- **`script.js`** — Two independent loops:
  1. `updateFromScroll()` (fired on `scroll`) maps `window.scrollY` to a 0–1 progress, calls `updateScenes()` to toggle `.active` on the correct scene.
  2. `videoLoop()` (RAF loop) smoothly interpolates `video.currentTime` toward `targetTime` using a `SMOOTHING` factor (default 0.12). Seeks are gated by `isSeeking` flag to avoid queuing seeks.
- **`style.css`** — `.scene .glass` is invisible by default (opacity 0, translated off-screen, clipped via `clip-path: polygon(0 0, 0 0, 0 100%, 0 100%)`). Adding `.active` resets all transforms and opens `clip-path` to full rectangle — the CSS transition does the animation.

## Key Constants (script.js)

| Constant | Default | Effect |
|---|---|---|
| `FPS` | 30 | Must match video frame rate |
| `SMOOTHING` | 0.12 | Lower = smoother/slower seek; higher = more direct |

## Adding a New Scene

1. Add a `.scene.scene-N` div in `index.html` with appropriate `data-from` / `data-to` range (distribute 0–1 across all scenes evenly).
2. Update existing scenes' `data-to` / `data-from` to redistribute ranges.
3. Add entry-direction transform in `style.css` under `.scene-N .glass`.
4. Add layout positioning rules (`.scene-N { align-items: ...; justify-content: ...; }`).
5. The `sectionNum` counter (`01 / 06`) updates automatically from `scenes.length`.
