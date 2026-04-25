# Scroll Stage

Cinematic scrollytelling-techniek: één sticky pin, meerdere video's en tekst-captions die naadloos crossfaden terwijl de bezoeker scrollt. Geen "blok-naar-blok" sprongen. Elke video scrubt op scrollsnelheid (max 1× real-time), tekst drift mee met spring-animaties, en op brede schermen blijft alles in een content-shell.

Originele build: [Bakkerij Van Seumeren](https://bold700.github.io/ambachtelijke-bakker/) — een dorpsbakkerij-pitch in 8 hoofdstukken.

## Wanneer dit werkt

| Use case | Waarom |
|---|---|
| Portfolio met video-werk | Elk project = caption met eigen scrub-clip |
| Restaurant / bakker / koffiebar | Sfeer + menu in één immersive scroll |
| Hotel / B&B | Kamertypes als hoofdstukken |
| Productlaunch | Ingrediënten / features als chapters, eindigend in een CTA |
| Editorial longread met video-segmenten | Scrollytelling op steroïden |

## Wanneer het *niet* werkt

- Sites met veel klikbare interactie per scherm (e-commerce dashboards, app-marketing met buttons overal)
- Content-zware sites (blog, nieuws) waar tekst de hoofdrol heeft
- Mobiele-first sites met data-bundel-zorgen — videos zijn 3-10MB elk

## Wat zit erin

| File | Inhoud |
|---|---|
| [`SPEC.md`](./SPEC.md) | Complete technische spec — architectuur, alle CSS-klassen, JS-modules |
| [`PROMPT.md`](./PROMPT.md) | Drop-in prompt voor Claude / Cursor / Copilot om een nieuw project te scaffolden |
| [`CURSOR.md`](./CURSOR.md) | Stap-voor-stap workflow om een nieuw project te bouwen in Cursor |
| [`starter/`](./starter/) | Minimale werkende versie (HTML + CSS + JS + `.cursorrules`), copy-paste klaar |

## Kernprincipes (in één alinea)

Eén `<section class="stage">` houdt een `position: sticky` pin van `100dvh`. Daarbinnen stapelen alle video's (`<video class="stage__video">` op `position: absolute; inset: 0`) en alle captions (`<div class="stage__caption">`). Per scrollpositie wordt de actieve `idx` berekend uit `(scrollY - track.offsetTop) / (track.height - viewport)` mapped naar `1/N` slices. De active video krijgt class `is-active` (opacity 0 → 1, anderen 0), idem voor de active caption. De active video's `currentTime` wordt op rAF gescrubt met een lerp (0.4) en velocity cap (1× real-time) zodat het altijd cinematic voelt.

## Tech stack

- **HTML/CSS/JS** — geen framework. Alles vanilla.
- **[Lenis](https://github.com/darkroomengineering/lenis)** — smooth scroll (CDN, 1 file).
- **Fraunces + Geist + Geist Mono** — Google Fonts. Andere fonts werken ook.
- **ffmpeg** — om video's te encoden met all-keyframe (essentieel voor smooth scrubbing).
- **Hosting**: GitHub Pages, Vercel, Netlify — elke statische host. Zorg wel dat HTTP Range requests ondersteund worden (anders moet je videos als blob preloaden, zie SPEC).

## Snelle start

```bash
# clone of download starter/
cp -R starter/ my-new-project/
cd my-new-project
python3 -m http.server 4321  # of: npx serve
open http://localhost:4321
```

## Licentie

MIT. Verkoop, deel, fork — zolang de attribution in de code blijft staan.
