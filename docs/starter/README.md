# Scroll Stage — Starter

Werkende minimale Scroll Stage site. **Open en starten — placeholders draaien direct.** Swap je echte video's wanneer je ze hebt.

## Direct draaien (3 commando's)

```bash
python3 -m http.server 4321
```

Open <http://localhost:4321>. Je ziet 4 chapters met geanimeerde gradient-placeholders die op scroll scrubben. Edit `index.html` voor je eigen tekst.

## Wat zit erin

```
.cursorrules         AI-rules voor Cursor (laden automatisch)
index.html           4-chapter stage (hero + 2 chapters + closer)
styles.css           ~5KB CSS, alle tokens en classes
app.js               ~3KB JS, Lenis + scrubber + anchor handler
media/               4 placeholder mp4's (~700KB totaal)
  00.mp4 — hero
  01.mp4 — chapter 01
  02.mp4 — chapter 02
  03.mp4 — closer
bin/encode.sh        Helper-script om je eigen video's te encoden
```

## Eigen video's invoegen

1. Drop je raw clips in een folder `raw/` (mov, mp4, mkv — ffmpeg leest het)
2. Run het encode-script:

   ```bash
   bin/encode.sh raw/*.mp4
   ```

   Dit produceert `media/<naam>.mp4` per input — 960px breed, all-keyframes, geen audio, ~3-6MB per 8s clip.

3. Zorg dat de filenames matchen wat in `index.html` staat (`00.mp4` voor hero, `01.mp4` t/m `03.mp4` voor chapters), of pas de `<source>` paths aan.

Manueel encoden kan ook:

```bash
ffmpeg -i input.mp4 -vf "scale=960:-2" -c:v libx264 -preset slow -crf 24 \
  -g 1 -keyint_min 1 -sc_threshold 0 -an -movflags +faststart media/01.mp4
```

## Meer chapters toevoegen

In `index.html`:

1. Verhoog `--ch-count` op `.stage__track`. 4 → 5 voor één extra.
2. Voeg een `<video>` toe in `.stage__media` met `data-ch="N"` en `<source>`.
3. Voeg een `<div class="stage__caption">` toe in `.stage__captions` met dezelfde `data-ch`. Wissel `--left` en `--right` af.

Geen JS-aanpassingen nodig — de scrubber telt automatisch.

## Aanpassen

| Wat | Waar |
|---|---|
| Brand kleur | `:root { --ember: #...; }` in `styles.css` |
| Achtergrondkleur | `:root { --ink: #...; }` |
| Display font | Google Fonts `<link>` in `<head>` + `--f-display` |
| Lengte van scroll per chapter | `--ch-count` of `100vh` factor in `.stage__track` |
| Scrub-snelheid | `maxStep = dt` in `app.js` (= 1× real-time, hoger = sneller) |

## Cursor-tips

`.cursorrules` is automatisch geladen. In een nieuwe Cursor-sessie weet de AI welke class-namen het moet gebruiken en welke patterns het moet volgen. Vraag rustig:

> "Voeg een 5e chapter toe tussen 02 en 03 voor 'het meel'. Right-aligned, body over een lokale molen."

en het wordt consistent toegevoegd.

## Volgende stap

Voor de complete spec en geavanceerde features (live voorraad-grid, dock theme switching, drift parallax): zie `../SPEC.md`. Voor de Cursor workflow van A tot Z: `../CURSOR.md`.
