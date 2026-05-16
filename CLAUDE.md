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
  - **House scenes (0–5)**: no `data-section` attribute, drive `house.mp4`. Scene 3 has two `.card.glass` siblings; Scene 4 uses `.card-line` + `.card`.
  - **Vibe scenes (6–11)**: `data-section="vibe"`, drive `vibes.mp4`. Same card variants as above.
  - Each scene has `data-from` / `data-to` attributes defining its active range in **local progress** (0–1 within its own video half), not global scroll progress.

- **`script.js`** — Three independent concerns:
  1. `updateFromScroll()` (fired on `scroll`) computes `overall` progress (0–1 over the full 1400vh), then derives `houseProgress` (first 50%) and `vibeProgress` (second 50%) from it.
  2. `videoLoop()` (RAF loop) runs two parallel seek-smoothers — one per video — interpolating `currentTime` toward `targetTime` with `SMOOTHING`. Seeks are gated by `isSeeking` / `isSeeking2` flags.
  3. `updateCrossfade()` — at `overall ≈ SPLIT (0.5)`, fades `video2` opacity from 0→1, simultaneously fades all house scenes out and vibe scenes in.

- **`style.css`** — `.scene .glass` is invisible by default (`opacity 0`, translated off-screen, `clip-path: polygon(0 0, 0 0, 0 100%, 0 100%)`). Adding `.active` resets transforms and opens `clip-path` to full rectangle — the CSS transition animates the reveal.

## Key Constants (script.js)

| Constant | Default | Effect |
|---|---|---|
| `FPS` | 30 | Must match video frame rate |
| `SMOOTHING` | 0.12 | Lower = smoother/slower seek; higher = more direct |
| `SPLIT` | 0.5 | Overall scroll progress where `house.mp4` ends and `vibes.mp4` begins |
| `FADE_BAND` | 0.025 | Half-width of the crossfade zone (±2.5% around `SPLIT`) |

## Adding a New Scene

Scenes belong to one of the two video halves. Pick the target half, then:

1. Add a `.scene.scene-N` div in `index.html` with `data-from` / `data-to` in **local 0–1 space** (redistribute the existing ranges in that half).
2. For vibe scenes, add `data-section="vibe"`. House scenes need no attribute.
3. Add entry-direction transform in `style.css` under `.scene-N .glass` (or `.card:nth-child`).
4. Add layout positioning rules (`.scene-N { align-items: ...; justify-content: ...; }`).
5. The counter (`01 / 12`) updates automatically from `houseScenes.length + vibeScenes.length`.

## Scene Variants

| Variant | When to use | HTML pattern |
|---|---|---|
| Single glass card | Default | `<div class="card glass">` |
| Two glass cards | Side-by-side split | Two `.card.glass` siblings directly in `.scene` |
| Card-line + card | Horizontal rule + body | `<div class="card-line">` then `<div class="card glass">` |
