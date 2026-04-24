# Bakkerij Van Seumeren

Een scrollytelling site voor een fictieve Utrechtse bakkerij uit Maarssen, sinds 1968. Zeven hoofdstukken met scroll-scrubbed video's, een live-voorraad-blok en een smooth-scroll ervaring via Lenis.

## Stack

- Statische HTML / CSS / JS
- [Lenis](https://github.com/darkroomengineering/lenis) voor smooth-scroll
- Geen build step — open `index.html` of serveer met een simpele HTTP-server

## Lokaal draaien

```
python3 -m http.server 4321
```

Dan naar http://localhost:4321

## Structuur

```
index.html          – pagina + stages + captions
styles.css          – alle styles (tokens, stages, voorraad, responsive)
app.js              – Lenis-init, stage-scrubber, live voorraad-ticker
media/              – hoofdstuk-videos (all-keyframe H.264, voor soepel scrubben)
```

Per hoofdstuk wordt een eigen video via scroll gescrubt binnen één sticky frame; tekst-captions crossfaden tussen hoofdstukken.

## Hosting

Deze site wordt gehost via GitHub Pages. Branch `main`, map `/` (root).
