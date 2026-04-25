# Scroll Stage — AI Prompt

Plak dit volledig in Claude Code, Cursor, Copilot, of een andere AI-coding agent. Vul de bovenste **CONFIG**-sectie in en de agent bouwt een complete cinematic scrollytelling-site.

---

## CONFIG (vul in)

```yaml
project:
  name: "[merknaam]"
  tagline: "[korte tagline van een halve zin]"
  domain: "[domain.com of subdir]"
  contact_email: "[hallo@example.com]"

design:
  primary_color: "#b35a22"     # accent (ember-tint, blue, of wat je merk wil)
  ink_color: "#141210"          # off-black, niet pure black
  paper_color: "#f4ecd8"        # warm off-white, niet pure white
  display_font: "Fraunces"      # Google font, serif voor display
  body_font: "Geist"            # Google font, sans voor body
  mono_font: "Geist Mono"       # Google font, mono voor labels

chapters:
  # 6-8 hoofdstukken, eerste is altijd hero
  - id: hero
    type: hero
    eyebrow: "[korte status-line]"
    display: "[H1 in twee regels — eerste rechtop, tweede italic]"
    lede: "[1-2 zinnen die de site samenvatten]"
    cta_primary: { label: "[bv. Menu]", target: "#last" }
    cta_secondary: { label: "[bv. Contact]", target: "mailto:..." }
    video: "media/hero.mp4"

  - id: ch-01
    type: chapter
    align: left                 # left of right (afwisselen)
    kicker: "[topic · sub]"
    num: "[04:00 of 12 min of een nummer]"
    title: "[korte zin, italic in display]"
    body: "[2-3 zinnen. Concreet, specifiek, geen filler]"
    video: "media/ch-01.mp4"

  - id: ch-02
    type: chapter
    align: right
    # … etc
  
  - id: voorraad                # optioneel: full-width caption met productenlijst
    type: full
    eyebrow: "[live status line]"
    title: "[H2]"
    products:
      - { name: "[product]", price: "€2,80", total: 40, left: 28, min: 6 }
      # …

  - id: last
    type: chapter
    align: left
    kicker: "kom langs"
    num: "12"
    title: "[Adres]"
    body: "[Openingstijden + sfeer]"
    cta: { label: "[CTA]", target: "mailto:..." }
    video: "media/last.mp4"
```

---

## INSTRUCTIES VOOR DE AGENT

Bouw een statische website ("Scroll Stage" architectuur) met deze regels:

### Stack
- Vanilla HTML, CSS, JS. Geen framework.
- Lenis via CDN (`https://unpkg.com/lenis@1.1.14/dist/lenis.min.js`).
- Google Fonts via `<link>`.
- Geen build step — files moeten direct werken via `python3 -m http.server`.

### Bestandsstructuur
```
project/
  index.html         — main page (alle chapters in één stage)
  styles.css         — alle CSS, gebruik design tokens uit CONFIG
  app.js             — Lenis init + stage scrubber + anchor handler
  media/
    hero.mp4         — all-keyframe encoded
    ch-01.mp4
    …
```

### HTML-skelet

```html
<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{{name}} — {{tagline}}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family={{display_font}}:ital,opsz,wght@0,9..144,300;0,9..144,500;1,9..144,300;1,9..144,500&family={{body_font}}:wght@300;400;500;600;700&family={{mono_font}}:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <div class="grain" aria-hidden="true"></div>

  <header class="dock">
    <a class="dock__brand" href="./">…</a>
    <nav class="dock__nav">…</nav>
    <a class="btn btn--ghost dock__cta" href="mailto:{{contact_email}}">Zet opzij</a>
  </header>

  <section class="stage" data-stage>
    <div class="stage__track" style="--ch-count: {{N}};" id="top">
      <div class="stage__pin">
        <div class="stage__media">
          <!-- N video's -->
        </div>
        <div class="stage__captions">
          <!-- N captions, eerste = hero, rest = left/right/full alternerend -->
        </div>
      </div>
    </div>
  </section>

  <footer class="foot">…</footer>

  <script src="https://unpkg.com/lenis@1.1.14/dist/lenis.min.js"></script>
  <script src="./app.js" defer></script>
</body>
</html>
```

### CSS-essentials

Gebruik exact deze class-namen en deze regels (verkorte versie, volledige versie staat in `SPEC.md`):

```css
:root {
  --paper: {{paper_color}};
  --ink: {{ink_color}};
  --ember: {{primary_color}};
  --shell-max: 1360px;
  --shell-pad: clamp(20px, 4vw, 56px);
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.35, 0.64, 1);
}

html { scrollbar-gutter: stable; }

.stage__track { position: relative; height: calc(var(--ch-count, 1) * 100vh); }
.stage__pin { position: sticky; top: 0; height: 100dvh; overflow: hidden; isolation: isolate; }
.stage__media { position: absolute; inset: 0; z-index: 0; }
.stage__video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.55s var(--ease); }
.stage__video.is-active { opacity: 1; }
.stage__captions { position: absolute; inset: 0; z-index: 1; }
.stage__caption {
  position: absolute; inset: 0;
  display: grid; align-items: center; grid-template-columns: 1fr 1fr;
  padding: 0 max(var(--shell-pad), calc((100% - var(--shell-max)) / 2));
  opacity: 0; transition: opacity 0.6s var(--ease); pointer-events: none;
}
.stage__caption.is-active { opacity: 1; pointer-events: auto; }
.stage__caption--left .chapter__card { grid-column: 1; }
.stage__caption--right .chapter__card { grid-column: 2; margin-left: auto; }
.stage__caption .chapter__card { max-width: 540px; padding: clamp(80px, 10vh, 140px) 0; display: flex; flex-direction: column; gap: 18px; }
```

### JS-essentials

Gebruik deze structuur in `app.js`:

```js
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const subscribers = new Set();

  // 1. Lenis
  const lenis = !reduced && window.Lenis ? new Lenis({ duration: 0.8, lerp: 0.2 }) : null;
  const tick = (t) => { lenis?.raf(t); subscribers.forEach((fn) => fn(t)); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);

  // 2. Lazy blob preload
  const blobCache = new Map();
  const toBlob = (url) => blobCache.get(url) ?? blobCache.set(url, fetch(url).then(r => r.blob()).then(b => URL.createObjectURL(b))).get(url);

  // 3. Stage scrubber — zie SPEC.md sectie 3.3 voor volledige code

  // 4. Anchor handler voor in-stage captions — zie SPEC.md sectie 3.4
})();
```

### Video-encoding (eenmalig per clip)

```bash
ffmpeg -i input.mp4 -vf "scale=960:-2" -c:v libx264 -preset slow -crf 24 -g 1 -keyint_min 1 -sc_threshold 0 -an -movflags +faststart output.mp4
```

Doel-grootte: 3-6MB per clip.

### Copywriting-regels

1. **Geen em-dash** (—). Vervang door komma, punt of dubbele punt.
2. **Geen verzonnen historie** ("sinds 1932" als het niet waar is). Wees eerlijk over wat het is.
3. **Specifiek > abstract.** "Twaalf minuten kneden" beats "veel zorg en aandacht".
4. **Korte zinnen, max 3 per body.** Captions zijn geen blog-posts.
5. **Numbers do work.** Een specifiek getal in elke chapter geeft ritme.
6. **Italic in display = accent.** Eerste regel rechtop, tweede italic in accent-kleur.

### Wat niet doen

- ❌ Geen scroll-listener in plaats van rAF.
- ❌ Geen video-laad bij init voor alle videos. Lazy via blob.
- ❌ Geen `h-screen` voor pinned containers. Gebruik `100dvh`.
- ❌ Geen pure black `#000`. Gebruik off-black.
- ❌ Geen Inter font.
- ❌ Geen gegenereerde Lorem-ipsum. Echte content of niets.

### Acceptance criteria

- Scroll van top tot footer werkt op desktop én mobile zonder blokken-blokken.
- Video's wisselen seamless (crossfade < 0.6s).
- Op een 1920px monitor zit content nooit verder dan 1360px breed.
- Caption-anchors uit nav scrollen naar de caption (niet naar 0).
- `prefers-reduced-motion` zet alle scroll-animaties uit.
- 60fps tijdens scroll op een MacBook Pro M1 of vergelijkbaar.

---

## VOORBEELD-INVOCATIE

> Bouw met deze prompt een Scroll Stage site voor een wijngaard "Domein Hellebusch" met de tagline "Single-vineyard, single-harvest". Domein hellebusch.be, contact info@hellebusch.be. Primary color #4a2845 (donkerrood). Display font Cormorant Garamond. 6 chapters: hero (de oogst klaar) → 04:30 (de pluk start) → 18 (kg per hand) → 24h (gisting tijd) → produkt-grid (8 wijnen, prijzen, voorraad) → kom proeven (adres, openingstijden). Hou het ambachtelijk, modern.

De agent zou dan moeten teruggeven: complete `index.html`, `styles.css`, `app.js`, en een lijst met video's die nog moeten worden geleverd.

---

## TWEAKS NA GENERATIE

| Wat | Hoe |
|---|---|
| Andere lerp/snap-feel | `lerp: 0.15-0.25` op Lenis, `delta * 0.4` in stage scrubber |
| Snellere/langzamere video-scrub | `maxStep = X * dt` waar X = max real-time-ratio (1 = locked, 3 = mild fast-fwd) |
| Andere accent-kleur | `--ember`, `--ember-soft` in `:root` |
| Meer/minder chapters | `--ch-count` op `.stage__track` + matching aantal videos + captions |
| Caption alignment | `--left` of `--right` class op `.stage__caption` |
| Volle breedte caption | `--full` class — voor productlijsten, grids |
