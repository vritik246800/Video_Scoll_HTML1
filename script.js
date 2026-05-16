/* ── DOM ── */
const video       = document.getElementById('bg-video');
const video2      = document.getElementById('bg-video-2');
const progressBar = document.getElementById('progress-bar');
const scrollHint  = document.getElementById('scroll-hint');
const sectionNum  = document.getElementById('section-num');
const houseScenes = document.querySelectorAll('.scene:not([data-section="vibe"])');
const vibeScenes  = document.querySelectorAll('.scene[data-section="vibe"]');
const container   = document.getElementById('scroll-container');

const TOTAL = houseScenes.length + vibeScenes.length;

/* ── CONFIG ── */
const FPS       = 30;
const FRAME_DUR = 1 / FPS;
const SMOOTHING = 0.12;
const SPLIT     = 0.5;    // overall progress onde house termina e vibe começa
const FADE_BAND = 0.025;  // meia-largura da zona de crossfade

/* ── ESTADO VÍDEO 1 ── */
let targetTime  = 0;
let currentTime = 0;
let isSeeking   = false;

/* ── ESTADO VÍDEO 2 ── */
let targetTime2  = 0;
let currentTime2 = 0;
let isSeeking2   = false;

/* ── PROGRESSO GLOBAL ── */
function getScrollProgress() {
  const maxScroll = container.scrollHeight - window.innerHeight;
  return maxScroll > 0 ? Math.min(Math.max(window.scrollY / maxScroll, 0), 1) : 0;
}

/* ── ÍNDICE ACTIVO numa lista de scenes ── */
function getActiveIdx(list, progress) {
  let idx = 0;
  list.forEach((scene, i) => {
    const from = parseFloat(scene.dataset.from);
    const to   = parseFloat(scene.dataset.to);
    const last = i === list.length - 1;
    if (progress >= from && (last || progress < to)) idx = i;
  });
  return idx;
}

let lastHouseIdx = -1;
let lastVibeIdx  = -1;

function updateHouseScenes(houseProgress) {
  const idx = getActiveIdx(houseScenes, houseProgress);
  if (idx !== lastHouseIdx) {
    houseScenes.forEach((s, i) => s.classList.toggle('active', i === idx));
    lastHouseIdx = idx;
  }
  sectionNum.textContent =
    String(idx + 1).padStart(2, '0') + ' / ' + String(TOTAL).padStart(2, '0');
}

function updateVibeScenes(vibeProgress) {
  if (!vibeScenes.length) return;
  const idx = getActiveIdx(vibeScenes, vibeProgress);
  if (idx !== lastVibeIdx) {
    vibeScenes.forEach((s, i) => s.classList.toggle('active', i === idx));
    lastVibeIdx = idx;
  }
  sectionNum.textContent =
    String(houseScenes.length + idx + 1).padStart(2, '0') + ' / ' + String(TOTAL).padStart(2, '0');
}

/* ── CROSSFADE ── */
function updateCrossfade(overall) {
  const fadeStart = SPLIT - FADE_BAND;
  const fadeEnd   = SPLIT + FADE_BAND;
  let opacity2    = 0;
  let houseAlpha  = 1;
  let vibeAlpha   = 0;

  if (overall >= fadeEnd) {
    opacity2   = 1;
    houseAlpha = 0;
    vibeAlpha  = 1;
  } else if (overall > fadeStart) {
    const t  = (overall - fadeStart) / (FADE_BAND * 2);
    opacity2  = t;
    houseAlpha = 1 - t;
    vibeAlpha  = 0;
  }

  video2.style.opacity = opacity2;
  houseScenes.forEach(s => { s.style.opacity = houseAlpha; });
  vibeScenes.forEach(s  => { s.style.opacity = vibeAlpha; });
  sectionNum.style.opacity = Math.max(houseAlpha, vibeAlpha);
}

/* ── UPDATE PRINCIPAL ── */
function updateFromScroll() {
  const overall = getScrollProgress();

  const houseProgress = Math.min(Math.max(overall / SPLIT, 0), 1);
  const vibeProgress  = Math.min(Math.max((overall - SPLIT) / (1 - SPLIT), 0), 1);

  targetTime  = houseProgress * (video.duration  || 0);
  targetTime2 = vibeProgress  * (video2.duration || 0);

  progressBar.style.width  = (overall * 100) + '%';
  scrollHint.style.opacity = overall > 0.02 ? '0' : '1';

  updateHouseScenes(houseProgress);

  /* Só activa vibe scenes quando o crossfade começa — evita flash de estado activo */
  if (overall >= SPLIT - FADE_BAND) {
    updateVibeScenes(vibeProgress);
  } else if (lastVibeIdx !== -1) {
    vibeScenes.forEach(s => s.classList.remove('active'));
    lastVibeIdx = -1;
  }

  updateCrossfade(overall);
}

/* ── INICIALIZAÇÃO DOS VÍDEOS ── */
video.addEventListener('loadedmetadata', () => {
  video.pause();
  video.playbackRate = 0;
  updateFromScroll();
});
video.addEventListener('seeked', () => { isSeeking = false; });

video2.addEventListener('loadedmetadata', () => {
  video2.pause();
  video2.playbackRate = 0;
  updateFromScroll();
});
video2.addEventListener('seeked', () => { isSeeking2 = false; });

/* ── RAF LOOP — scrub suave dos dois vídeos ── */
function videoLoop() {
  if (video.duration) {
    const diff    = targetTime - currentTime;
    currentTime  += diff * SMOOTHING;
    const snapped = Math.round(currentTime / FRAME_DUR) * FRAME_DUR;
    const delta   = Math.abs(snapped - video.currentTime);
    if (!isSeeking && delta >= FRAME_DUR) {
      isSeeking = true;
      video.currentTime = snapped;
    }
  }

  if (video2.duration) {
    const diff2    = targetTime2 - currentTime2;
    currentTime2  += diff2 * SMOOTHING;
    const snapped2 = Math.round(currentTime2 / FRAME_DUR) * FRAME_DUR;
    const delta2   = Math.abs(snapped2 - video2.currentTime);
    if (!isSeeking2 && delta2 >= FRAME_DUR) {
      isSeeking2 = true;
      video2.currentTime = snapped2;
    }
  }

  requestAnimationFrame(videoLoop);
}

window.addEventListener('scroll', updateFromScroll, { passive: true });

videoLoop();
updateFromScroll();
