# Scroll Stage — Technical Spec

Volledige beschrijving van de architectuur, de CSS-klassen en de JS-modules die deze techniek mogelijk maken. Werk dit naast `starter/` als referentie.

---

## 1. Architectuur

### 1.1 De stage

```
<section class="stage" data-stage>
  <div class="stage__track" style="--ch-count: 6;">  ← scroll track, height = N × 100vh
    <div class="stage__pin">                          ← position: sticky, top: 0, height: 100dvh
      <div class="stage__progress"><span></span></div>
      <div class="stage__media">
        <video class="stage__video is-active" data-ch="0">…</video>   ← N video's, gestapeld
        <video class="stage__video" data-ch="1">…</video>
        …
      </div>
      <div class="stage__captions">
        <div class="stage__caption stage__caption--hero is-active" data-ch="0">…</div>
        <div class="stage__caption stage__caption--left" data-ch="1">…</div>
        <div class="stage__caption stage__caption--right" data-ch="2">…</div>
        …
      </div>
    </div>
  </div>
</section>
```

**Verklaring:**

- `.stage__track` is `N × 100vh` hoog — geeft de scroll-afstand voor `N` hoofdstukken.
- `.stage__pin` is `position: sticky; top: 0; height: 100dvh` — blijft in zicht zolang de track in zicht is.
- `.stage__media` houdt N video's, allemaal op `position: absolute; inset: 0; opacity: 0`. Eén heeft `is-active` met `opacity: 1`. Bij chapter-wissel crossfade.
- `.stage__captions` houdt N caption-divs, idem zelfde patroon.
- Elke caption + video deelt dezelfde `data-ch="N"` index.

### 1.2 Caption-varianten

| Variant | Layout | Use |
|---|---|---|
| `.stage__caption--hero` | Volle breedte, links uitgelijnd, eyebrow + display + lede + CTAs | Eerste/laatste hoofdstuk |
| `.stage__caption--left` | 1fr 1fr grid, kaart in kolom 1 | Standaard chapter, content links |
| `.stage__caption--right` | 1fr 1fr grid, kaart in kolom 2, `margin-left: auto` | Standaard chapter, content rechts |
| `.stage__caption--full` | 1fr grid, kaart full-width | Voorraad-grid, productenlijst |

### 1.3 De scrub-cyclus per frame

```
1. raw progress = (scrollY - track.offsetTop) / (track.height - viewport)
2. clamp p = [0, 1]
3. slice = 1 / N
4. idx = floor(p / slice)             ← welke chapter is actief
5. local = (p - idx * slice) / slice  ← progress binnen die chapter [0, 1]

6. if idx changed:
     toggle is-active on video[idx] and caption[idx]
     snap state[idx].current = state[idx].target = local * duration
     video[idx].currentTime = state[idx].current      ← prevent backward-lerp on re-entry
     loadVideo(idx); loadVideo(idx-1); loadVideo(idx+1)  ← lazy preload neighbors

7. state[idx].target = local * duration
8. delta = target - current
9. desired = delta * 0.4              ← lerp factor
10. maxStep = dt                       ← 1× real-time velocity cap
11. step = clamp(desired, -maxStep, maxStep)
12. if |delta| < 0.01: snap to target  ← prevent residual micro-drift
13. video[idx].currentTime = state[idx].current
```

---

## 2. CSS — verplichte tokens en klassen

### 2.1 Design tokens (CSS custom properties)

```css
:root {
  --paper: #f4ecd8;            /* warm off-white */
  --ink: #141210;              /* off-black */
  --ember: #b35a22;            /* enkele desaturated accent */
  --ember-soft: #e6b98e;
  --rule: #d4c8a8;
  --mute: #5c554a;

  --f-display: "Fraunces", serif;
  --f-body: "Geist", system-ui, sans-serif;
  --f-mono: "Geist Mono", monospace;

  --ease: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.35, 0.64, 1);
  --ease-snap: cubic-bezier(0.22, 0.9, 0.2, 1);

  --shell-max: 1360px;
  --shell-pad: clamp(20px, 4vw, 56px);
}
```

### 2.2 Stage-klassen (de essentie)

```css
.stage { background: var(--ink); color: var(--paper); }

.stage__track {
  position: relative;
  height: calc(var(--ch-count, 1) * 100vh);
}
.stage__pin {
  position: sticky; top: 0;
  height: 100dvh;
  overflow: hidden;
  isolation: isolate;
}

.stage__media { position: absolute; inset: 0; z-index: 0; }
.stage__video {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.55s var(--ease);
}
.stage__video.is-active { opacity: 1; }

.stage__captions { position: absolute; inset: 0; z-index: 1; }
.stage__caption {
  position: absolute; inset: 0;
  display: grid;
  align-items: center;
  grid-template-columns: 1fr 1fr;
  /* Content-shell op brede schermen */
  padding: 0 max(var(--shell-pad), calc((100% - var(--shell-max)) / 2));
  opacity: 0;
  transition: opacity 0.6s var(--ease);
  pointer-events: none;
}
.stage__caption.is-active { opacity: 1; pointer-events: auto; }
```

### 2.3 Caption-varianten

```css
.stage__caption--left  .chapter__card { grid-column: 1; }
.stage__caption--right .chapter__card { grid-column: 2; margin-left: auto; }

.stage__caption--hero { grid-template-columns: 1fr; align-content: center; }
.stage__caption--full { grid-template-columns: 1fr; align-items: center; }
```

### 2.4 Scrim-gradients (voor leesbaarheid van tekst over video)

```css
.stage__scrim { position: absolute; inset: 0; z-index: -1; pointer-events: none; }

.stage__scrim--left {
  background:
    linear-gradient(90deg, rgba(8,7,6,0.82) 0%, rgba(8,7,6,0) 70%),
    linear-gradient(180deg, rgba(8,7,6,0.45) 0%, rgba(8,7,6,0) 30%, rgba(8,7,6,0.55) 100%);
}
.stage__scrim--right {
  background:
    linear-gradient(-90deg, rgba(8,7,6,0.82) 0%, rgba(8,7,6,0) 70%),
    linear-gradient(180deg, rgba(8,7,6,0.45) 0%, rgba(8,7,6,0) 30%, rgba(8,7,6,0.55) 100%);
}
.stage__scrim--hero {
  background:
    radial-gradient(70% 60% at 70% 55%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 80%),
    linear-gradient(180deg, rgba(10,9,8,0.55) 0%, rgba(10,9,8,0.15) 22%, rgba(10,9,8,0.82) 100%);
}
```

### 2.5 Per-element entry-motion

Elke caption-kind heeft een eigen entrance: andere richting, duur, easing en delay. Dit voorkomt monotonie.

```css
/* Kicker: snel uit links */
.stage__caption .chapter__kicker {
  opacity: 0; transform: translate3d(-18px, 0, 0); filter: blur(3px);
  transition: opacity 0.45s var(--ease-snap), transform 0.6s var(--ease-snap);
}

/* Big number: blur-in, geen translate (laat parallax intact) */
.stage__caption .chapter__num {
  opacity: 0; filter: blur(22px);
  transition: opacity 1.15s var(--ease), filter 1.15s var(--ease);
}

/* Title: spring-overshoot van onder */
.stage__caption .chapter__title {
  opacity: 0; transform: translate3d(0, 44px, 0); filter: blur(8px);
  transition: opacity 0.75s var(--ease), transform 1.05s var(--ease-spring), filter 0.6s var(--ease);
}

/* Body: zacht, late delay */
.stage__caption .chapter__body {
  opacity: 0; transform: translate3d(0, 22px, 0);
  transition: opacity 0.85s var(--ease), transform 0.9s var(--ease);
}

/* Active state */
.stage__caption.is-active .chapter__kicker { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); transition-delay: 0.02s; }
.stage__caption.is-active .chapter__num { opacity: 1; filter: blur(0); transition-delay: 0.22s; }
.stage__caption.is-active .chapter__title { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); transition-delay: 0.38s; }
.stage__caption.is-active .chapter__body { opacity: 1; transform: translate3d(0, 0, 0); transition-delay: 0.56s; }
```

### 2.6 Scrollbar gutter (anders shift de hele layout)

```css
html { scrollbar-gutter: stable; }
```

Zonder dit verschijnt/verdwijnt de scrollbar tijdens Lenis-momenten en springt de hele pagina ~15px heen en weer.

---

## 3. JS — kernmodules

### 3.1 Lenis init + rAF loop

```js
const subscribers = new Set();
const lenis = new Lenis({ duration: 0.8, lerp: 0.2, smoothWheel: true });

const tick = (time) => {
  lenis.raf(time);
  subscribers.forEach((fn) => fn(time));
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
```

### 3.2 Lazy blob-preload (voor servers zonder HTTP Range)

```js
const blobCache = new Map();
const toBlob = (url) => {
  if (!blobCache.has(url)) {
    blobCache.set(url, fetch(url).then((r) => r.blob()).then((b) => URL.createObjectURL(b)));
  }
  return blobCache.get(url);
};
```

### 3.3 Stage-scrubber

```js
const makeStage = (stage) => {
  const track = stage.querySelector(".stage__track");
  const videos = Array.from(stage.querySelectorAll(".stage__video"));
  const captions = Array.from(stage.querySelectorAll(".stage__caption"));
  const N = videos.length;
  const state = videos.map(() => ({ current: 0, target: 0 }));
  let lastT = performance.now();
  let activeIdx = -1;

  const loadVideo = (v) => {
    if (!v || v._loaded) return;
    v._loaded = true;
    const url = new URL(v.querySelector("source").getAttribute("src"), location.href).href;
    toBlob(url).then((blobUrl) => { v.src = blobUrl; v.load(); });
  };
  loadVideo(videos[0]);

  const update = (time) => {
    const now = time || performance.now();
    const dt = Math.min(0.1, Math.max(0.001, (now - lastT) / 1000));
    lastT = now;

    const r = track.getBoundingClientRect();
    const total = track.offsetHeight - window.innerHeight;
    const p = Math.max(0, Math.min(1, total > 0 ? -r.top / total : 0));
    const slice = 1 / N;
    const idx = Math.min(N - 1, Math.floor(p / slice));
    const local = Math.max(0, Math.min(1, (p - idx * slice) / slice));

    if (idx !== activeIdx) {
      videos.forEach((v, i) => v.classList.toggle("is-active", i === idx));
      captions.forEach((c, i) => c.classList.toggle("is-active", i === idx));
      activeIdx = idx;
      loadVideo(videos[idx]);
      if (idx + 1 < N) loadVideo(videos[idx + 1]);
      if (idx - 1 >= 0) loadVideo(videos[idx - 1]);
      // Snap to current position to prevent backward lerp on re-entry
      const snapDur = videos[idx].duration || 8;
      const snapT = local * Math.max(0.01, snapDur - 0.02);
      state[idx].current = state[idx].target = snapT;
      try { videos[idx].currentTime = snapT; } catch (_) {}
    }

    // Scrub: lerp + cap aan 1× real-time
    const v = videos[idx], s = state[idx], dur = v.duration || 8;
    s.target = local * Math.max(0.01, dur - 0.02);
    const delta = s.target - s.current;
    const maxStep = dt;
    const desired = delta * 0.4;
    const step = Math.sign(desired) * Math.min(Math.abs(desired), maxStep);
    if (Math.abs(delta) < 0.01) s.current = s.target;
    else s.current += step;
    if (Math.abs(s.current - (v.currentTime || 0)) > 0.02) {
      try { v.currentTime = s.current; } catch (_) {}
    }
  };

  subscribers.add(update);
  window.addEventListener("resize", update);
};

document.querySelectorAll("[data-stage]").forEach(makeStage);
```

### 3.4 Anchor-scroll naar caption (cruciaal)

Captions zijn `position: absolute` binnen een sticky pin, dus `offsetTop` is 0. Zonder deze handler gaan `#anchor`-links nergens heen.

```js
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href").slice(1);
    if (!id) return;
    const t = document.getElementById(id);
    if (!t) return;
    e.preventDefault();

    const cap = t.closest(".stage__caption");
    if (cap) {
      const stage = cap.closest("[data-stage]");
      const track = stage.querySelector(".stage__track");
      const captions = stage.querySelectorAll(".stage__caption");
      const idx = Array.from(captions).indexOf(cap);
      const N = captions.length;
      const total = track.offsetHeight - window.innerHeight;
      const trackTop = track.getBoundingClientRect().top + window.scrollY;
      const target = trackTop + total * ((idx + 0.5) / N);
      lenis.scrollTo(target, { duration: 1.4 });
      return;
    }
    lenis.scrollTo(t, { offset: 0, duration: 1.4 });
  });
});
```

---

## 4. Video-encoding

Voor smooth scrubbing zijn alle frames keyframes. Dit maakt files ~3× groter dan normaal maar voorkomt stotteren bij seeking.

```bash
ffmpeg -i input.mp4 \
  -vf "scale=960:-2" \
  -c:v libx264 -preset slow -crf 24 \
  -g 1 -keyint_min 1 -sc_threshold 0 \
  -an -movflags +faststart \
  output.mp4
```

| Flag | Wat | Waarom |
|---|---|---|
| `scale=960:-2` | 960px breed, hoogte auto | Mobile-vriendelijke resolutie, ~3× kleiner dan 1920 |
| `-crf 24` | Quality 24 (lager = beter) | Goede balans voor donkere/atmosferische clips |
| `-g 1 -keyint_min 1 -sc_threshold 0` | Elke frame is keyframe | Smooth scrubbing |
| `-an` | Geen audio | Pages stuur muted, audio is dood gewicht |
| `+faststart` | Moov atom vooraan | Streaming start sneller |

**Doelgrootte:** 3-6MB per 8-seconden clip. Op een site met 6-8 chapters = 25-50MB totaal. Lazy-loading houdt initial-load onder 5MB.

---

## 5. Performance

| Metric | Doel | Hoe |
|---|---|---|
| Initial JS | < 30KB | Lenis (~10KB) + eigen app.js (~10KB) + geen framework |
| Initial video | 1 (active video only) | Lazy blob-preload van neighbours bij chapter-change |
| FPS tijdens scroll | 60 | rAF + transform/opacity only animations |
| Layout shift | 0 | `scrollbar-gutter: stable` + fixed dock |

---

## 6. Bekende valkuilen

| Probleem | Oplossing |
|---|---|
| Video reverse-played bij re-entry | Snap state op chapter-change (zie 3.3) |
| Page shifts horizontaal | `scrollbar-gutter: stable` op `<html>` |
| Mobiele scroll geblokkeerd | Lenis `overflow: clip` alleen toepassen op `.lenis-smooth`, niet op `.lenis` |
| Anchor links gaan nergens | Custom click handler die in-stage captions berekent (zie 3.4) |
| Video laadt niet op static host | Servers zonder HTTP Range support: blob-preload (zie 3.2) |
| Tekst plakt aan rand op brede monitors | `padding: 0 max(shell-pad, (100% - shell-max) / 2)` op caption |

---

## 7. Variaties

### Mini-stage (1 chapter)

Set `--ch-count: 1`, één video, één caption. Geen crossfade nodig, alleen scrub. Goed voor één-pagers met video-hero.

### Voorraad-grid in caption

Gebruik `.stage__caption--full` met een `<ul class="products">` grid binnenin. Voor live-data: tick een `setInterval` die counts decrementeert tot een floor-waarde.

### Multi-stage

Meerdere `<section class="stage" data-stage>` na elkaar. Tussen stages kun je gewone content-secties hebben. Maar binnen één stage is altijd seamless.

---

## 8. Naming conventions

```
.stage              → outer section
.stage__track       → scroll track (height-driven)
.stage__pin         → sticky pinned container
.stage__media       → all videos stacked
.stage__video       → individual video
.stage__captions    → all captions stacked
.stage__caption     → individual caption (with --left, --right, --hero, --full variants)
.stage__scrim       → gradient overlay (with --left, --right, --hero, --full variants)

.chapter__card      → text container inside .stage__caption
.chapter__kicker    → eyebrow (mono, small caps)
.chapter__num       → big display number (Fraunces or similar)
.chapter__title     → italic chapter title
.chapter__body      → body paragraph
```

Stick to BEM-ish patterns; het houdt scoping makkelijk.
