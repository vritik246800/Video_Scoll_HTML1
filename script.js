/* ── DOM ── */
const video       = document.getElementById('bg-video');
const progressBar = document.getElementById('progress-bar');
const scrollHint  = document.getElementById('scroll-hint');
const sectionNum  = document.getElementById('section-num');
const scenes      = document.querySelectorAll('.scene');
const container   = document.getElementById('scroll-container');

/* ── STATE-DRIVEN SCENE ACTIVATION ──
   A scene activa deriva SEMPRE do scroll progress.
   Não há flag "isTransitioning" a bloquear nada.
   Cada update recalcula que scene está activa e ajusta classes.
*/
function getScrollProgress() {
  const maxScroll = container.scrollHeight - window.innerHeight;
  return maxScroll > 0 ? Math.min(Math.max(window.scrollY / maxScroll, 0), 1) : 0;
}

function getActiveSceneIndex(progress) {
  let idx = 0;
  scenes.forEach((scene, i) => {
    const from = parseFloat(scene.dataset.from);
    const to   = parseFloat(scene.dataset.to);
    const last = i === scenes.length - 1;
    if (progress >= from && (last || progress < to)) {
      idx = i;
    }
  });
  return idx;
}

let lastActiveIdx = -1;

function updateScenes(progress) {
  const activeIdx = getActiveSceneIndex(progress);

  if (activeIdx !== lastActiveIdx) {
    /* Aplica .active apenas à scene correcta — todas as outras perdem-na.
       O CSS faz o resto via transition. */
    scenes.forEach((scene, i) => {
      scene.classList.toggle('active', i === activeIdx);
    });
    lastActiveIdx = activeIdx;
  }

  sectionNum.textContent =
    String(activeIdx + 1).padStart(2, '0') + ' / ' +
    String(scenes.length).padStart(2, '0');
}

/* ── SCROLL SCRUBBING DO VÍDEO (optimizado) ── */
const FPS         = 30;             // ajusta se o vídeo for 24 ou 60
const FRAME_DUR   = 1 / FPS;
const SMOOTHING   = 0.12;           // 0.05 = mais suave/lento, 0.25 = mais directo
let   targetTime  = 0;
let   currentTime = 0;
let   isSeeking   = false;          // bloqueia novo seek enquanto um está pendente

video.addEventListener('loadedmetadata', () => {
  /* Optimizações no elemento de vídeo */
  video.pause();
  video.playbackRate = 0;
  updateFromScroll();
});

/* Marca quando o seek terminou — só então enviamos o próximo */
video.addEventListener('seeked', () => { isSeeking = false; });

function updateFromScroll() {
  const progress = getScrollProgress();

  targetTime = progress * (video.duration || 0);
  progressBar.style.width  = (progress * 100) + '%';
  scrollHint.style.opacity = progress > 0.04 ? '0' : '1';

  updateScenes(progress);
}

/* Loop separado do scroll — actualiza o vídeo no ritmo do display refresh,
   mas só envia seek quando o anterior terminou e a diferença justifica. */
function videoLoop() {
  if (video.duration) {
    /* Interpolação suave em direcção ao target */
    const diff = targetTime - currentTime;
    currentTime += diff * SMOOTHING;

    /* Snap ao frame mais próximo */
    const snapped = Math.round(currentTime / FRAME_DUR) * FRAME_DUR;
    const delta   = Math.abs(snapped - video.currentTime);

    /* Só envia seek se:
       - não há seek em curso
       - a diferença é >= 1 frame (evita work desnecessário) */
    if (!isSeeking && delta >= FRAME_DUR) {
      isSeeking = true;
      video.currentTime = snapped;
    }
  }
  requestAnimationFrame(videoLoop);
}

window.addEventListener('scroll', updateFromScroll, { passive: true });

videoLoop();
updateFromScroll();