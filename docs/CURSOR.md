# Bouwen in Cursor

Stap-voor-stap workflow om een nieuw Scroll Stage project op te zetten in [Cursor](https://cursor.com).

---

## 1. Project opzetten (eenmalig, ~3 minuten)

```bash
# Maak een nieuwe lege repo
mkdir my-stage-site && cd my-stage-site
git init

# Pak de starter
curl -L https://github.com/bold700/ambachtelijke-bakker/archive/main.tar.gz | \
  tar -xz --strip=2 ambachtelijke-bakker-main/docs/starter
mv starter/* . && mv starter/.cursorrules . 2>/dev/null
rm -rf starter

# Open in Cursor
cursor .
```

Of handmatig: kopieer `docs/starter/` in z'n geheel naar je nieuwe project en open die folder in Cursor.

---

## 2. AI-context aanzetten

De starter bevat al een `.cursorrules` file. Cursor leest die automatisch en kent dan de Scroll Stage conventies (welke class-namen te gebruiken, geen Inter font, geen em-dash, hoe de scrubber werkt, etc.).

**Verifieer dat hij geladen is**: open de Cursor settings → Rules. Je zou "Project rules: .cursorrules" moeten zien.

Optioneel — voeg ook de spec's toe als context:

```bash
# Kopieer SPEC.md en PROMPT.md naar je nieuwe project zodat Cursor ze kan lezen
curl -O https://raw.githubusercontent.com/bold700/ambachtelijke-bakker/main/docs/SPEC.md
curl -O https://raw.githubusercontent.com/bold700/ambachtelijke-bakker/main/docs/PROMPT.md
```

In Cursor chat kun je dan `@SPEC.md` of `@PROMPT.md` typen om die file expliciet als context mee te sturen.

---

## 3. Eerste sessie: vul het concept in

Open Cursor's **Composer** (`⌘+I` op Mac, `Ctrl+I` op Windows). Plak deze prompt en pas de YAML aan:

````
Lees @PROMPT.md en bouw een Scroll Stage site met deze config:

```yaml
project:
  name: "Domein Hellebusch"
  tagline: "Single-vineyard, single-harvest"
  contact_email: "info@hellebusch.be"

design:
  primary_color: "#4a2845"
  ink_color: "#171015"
  paper_color: "#f3ecdb"
  display_font: "Cormorant Garamond"
  body_font: "Geist"
  mono_font: "Geist Mono"

chapters:
  - id: hero
    type: hero
    eyebrow: "Vandaag · de oogst is binnen"
    display: "De druiven zijn op.<br/><em>Volgend jaar opnieuw.</em>"
    lede: "Achttien rijen Pinot Noir, allemaal met de hand geplukt vandaag. De gisting begint over zes uur."
    cta_primary: { label: "Onze wijnen", target: "#wijnen" }
    cta_secondary: { label: "Bezoek de wijngaard", target: "#kom-langs" }

  - id: ch-01
    type: chapter
    align: left
    kicker: "ochtend · 04:30"
    num: "04:30"
    title: "Voor de zon op is."
    body: "We beginnen voor het licht te warm wordt. Druiven blijven dan koeler en behouden hun zuren."

  - id: wijnen
    type: full
    eyebrow: "live voorraad · 2024 oogst"
    title: "Wat er nu in fles zit."
    products:
      - { name: "Pinot Noir 2023", price: "€24", total: 600, left: 412, min: 50 }
      - { name: "Chardonnay 2023", price: "€22", total: 800, left: 580, min: 80 }
      # …

  - id: kom-langs
    type: chapter
    align: left
    kicker: "kom proeven · zaterdag"
    num: "12"
    title: "Wijngaardstraat 12, Hoegaarden."
    body: "Open op zaterdag van 10 tot 17 uur. Reservering aanbevolen. Eerste glas op het huis."
    cta: { label: "Reserveer een proeverij", target: "mailto:..." }
```

Maak `index.html`, `styles.css`, en `app.js`. Houd je strikt aan de class-namen en patterns uit `.cursorrules` en `@SPEC.md`. Geen frameworks, vanilla JS, geen build step.
````

Cursor genereert dan alle bestanden in één pass. Je kan accepteren per file of als geheel.

---

## 4. Video's toevoegen

Drop je video's in `media/`. De starter verwacht `media/00.mp4` t/m `media/03.mp4`. Bij meer chapters: `media/04.mp4`, etc.

Encode elke clip met:

```bash
ffmpeg -i input.mp4 -vf "scale=960:-2" -c:v libx264 -preset slow -crf 24 \
  -g 1 -keyint_min 1 -sc_threshold 0 -an -movflags +faststart media/01.mp4
```

Voor batch:

```bash
for f in raw/*.mp4; do
  name=$(basename "$f")
  ffmpeg -y -i "$f" -vf "scale=960:-2" -c:v libx264 -preset slow -crf 24 \
    -g 1 -keyint_min 1 -sc_threshold 0 -an -movflags +faststart "media/$name"
done
```

Of vraag Cursor om een ffmpeg-script te genereren in een `bin/encode-videos.sh`.

---

## 5. Iteratie loop

Eenmaal de basis staat, gebruik Cursor's chat (`⌘+L`) voor iteratie. Voorbeeld-prompts:

> "Voeg een nieuw hoofdstuk toe tussen ch-01 en de voorraad: '06:30 · Het meel komt aan'. Right-aligned. Body: korte beschrijving van de molen."

> "Maak chapter 03 verticaal-gecentreerd in plaats van bottom-aligned op mobiel."

> "Verlaag `maxStep` van `dt` naar `dt * 0.7` zodat de video nog rustiger scrubt."

> "Voeg een aparte /menu pagina toe met dezelfde stage-mechaniek voor onze 12 wijnen."

Cursor weet uit `.cursorrules` welke class-namen het moet gebruiken en welke patterns het moet volgen, dus iteraties blijven consistent.

---

## 6. Live deployen

```bash
# Push naar GitHub
git remote add origin git@github.com:USERNAME/REPO.git
git add -A && git commit -m "Initial site"
git push -u origin main

# Pages aanzetten via gh CLI (of via UI: Settings → Pages → Source: main /)
gh api -X POST repos/USERNAME/REPO/pages -f "source[branch]=main" -f "source[path]=/"
```

Site is live op `https://USERNAME.github.io/REPO/` binnen ~1 minuut.

Voor custom domain: voeg een `CNAME` file toe met je domein, en zet je DNS op `USERNAME.github.io`.

---

## Tips bij Cursor

| Wat | Hoe |
|---|---|
| Snel naar een class-definitie | `⌘+P` → typ `.stage__caption` (of welke class dan ook) — Cursor doet symbol search |
| Multi-file refactor | Composer (`⌘+I`) i.p.v. chat (`⌘+L`). Composer kan `index.html` + `styles.css` + `app.js` tegelijk wijzigen |
| Voorbeeld-output reproduceren | Plak een screenshot in chat, vraag "match deze layout, gebruik .cursorrules" |
| Performance audit | "Open de site in een browser, check Lighthouse, fix wat onder de 90 score zit" — Cursor doet het zelf met de built-in browser |
| Concept-iteratie | Eerst tekst-only chapters genereren met placeholder-videos (data-URL of dummy mp4), pas later echte videos invoegen |

---

## Cursor MCP-integraties (optioneel)

Als je [Anthropic Files](https://docs.cursor.com/context/mcp) of een eigen MCP-server hebt, kun je `SPEC.md` en `PROMPT.md` permanent als context verbinden zodat ze in elke sessie meekomen zonder `@`-mention. Zie Cursor docs.
