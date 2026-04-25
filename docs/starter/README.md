# Scroll Stage — Starter

Minimaal werkend skelet. Vier hoofdstukken (hero + 2 chapters + closer), zonder voorraad-grid, zonder fancy entry-motion buiten de basis. Gebruik dit als beginpunt.

## Gebruik

1. Drop vier mp4's in `media/` — `00.mp4`, `01.mp4`, `02.mp4`, `03.mp4`. Encode ze met:

   ```bash
   ffmpeg -i input.mp4 -vf "scale=960:-2" -c:v libx264 -preset slow -crf 24 \
     -g 1 -keyint_min 1 -sc_threshold 0 -an -movflags +faststart out.mp4
   ```

2. Serveer:

   ```bash
   python3 -m http.server 4321
   ```

   Open <http://localhost:4321>.

3. Pas content aan in `index.html` (kicker / num / title / body per chapter).

## Wat zit erin

- `index.html` — 4-chapter stage met hero, two left/right captions en een closing chapter.
- `styles.css` — alle benodigde CSS (~5KB).
- `app.js` — Lenis init + stage scrubber + anchor handler (~3KB).

## Wat moet je nog doen

- Eigen video's leveren (zie ffmpeg-command boven).
- Brand-kleur aanpassen via `--ember` in `:root`.
- Display/body fonts wijzigen via Google Fonts link in `<head>`.
- Eventueel meer chapters toevoegen — verhoog `--ch-count` en voeg een `<video>` + `<div class="stage__caption">` toe.

## Volgende stap

Voor meer features (live voorraad-grid, dock theme switching, drift parallax op tekst): zie `../SPEC.md`. Voor een AI-prompt om een nieuw project te scaffolden: `../PROMPT.md`.
