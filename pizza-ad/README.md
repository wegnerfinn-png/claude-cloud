# Pumpy Pizza-Ad

Nachbau des Fork-Ranger-Spots ("Let's say this is the carbon footprint…") für Pumpy, komplett als Animation. Die Pizza ist alles, was man an einem Tag isst. Die drei Mahlzeiten werden getrackt, die vier dünnen Stücke (Öl, Latte, Nüsse, Probierhappen) nicht, und zusammen sind das 650 kcal. Der Scan mit Pumpy ist der CTA.

- 1080×1920, 30 fps, ca. 53 s, Untertitel im Stil des Originals (Balken in Pumpy-Blau)
- Pizza, Holzbrett und Beton sind prozedural gerendert, es werden keine Fotos und keine Hände verwendet. Das Messer schneidet von allein, die Props gleiten selbst ins Bild.
- Die Zahlen erscheinen als Lego-Pixel-Sticker. Beim Rätsel steht erst "?", dann folgt Stille und danach die Auflösung "650".
- Jedes Prop hat einen eigenen synthetisierten Sound (Schnitt, Öl, Tasse, Mandeln, Löffel, Spiegelei, …).

## Rendern

```bash
cd pizza-ad
npm install
node render.mjs              # out/pumpy-pizza.mp4 (+ .wav)
node render.mjs --preview    # schnelle Vorschau, 540×960 @ 15 fps
node render.mjs --from 28 --to 36   # nur einen Ausschnitt
```

Chrome bzw. Chromium wird automatisch gesucht. Den Pfad kannst du mit `CHROME_PATH=…` oder `--chrome …` setzen.

Live-Vorschau mit Scrubber: Starte `python3 -m http.server` im Ordner `pizza-ad` und öffne `http://localhost:8000`. Über einen lokalen Server statt `file://` lädt der Browser die Inter-Schrift. Die Texturen brauchen beim Laden ein paar Sekunden.

## Voiceover (Chatterbox)

```bash
node vo-script.mjs                                  # schreibt vo/lines.json und zeigt alle Zeilen
python vo/chatterbox_batch.py --voice stimme.wav    # erzeugt vo/01-hook.wav … vo/21-cta.wav
node render.mjs                                     # Beats dehnen sich auf die Cliplänge, VO wird gemischt
```

Ohne Dateien in `vo/` läuft das Video mit den Standard-Timings. Jede Zeile ist ein eigener "Beat". Ist ein Clip länger als sein Slot, wird der Beat verlängert und alle Animationen verschieben sich mit.

## Anpassen

`src/config.js`:

- `brand.color` legt die Pumpy-Farbe für Untertitel, Sticker, Scan-Ring und App-UI fest.
- `kcal` bestimmt die Kalorien pro Stück. Daraus werden die Winkel der Stücke, die Sticker, die Untertitel-Zahlen und die App-Liste berechnet.
- `appScreen` ist ein echter RPReplay-Frame (828×1792, ohne Kamera-Ansicht). Lege ihn als `assets/app-screen.png` ab, dann ersetzt er den Mock-Screen im Phone.

Die Texte stehen in `src/timeline.js`, eine Zeile pro Beat. `{tracked}`, `{hidden}`, `{pct}` und `{budget}` werden automatisch aus der Config befüllt.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `src/textures.js` | Beton, Holzbrett, Pizza (Noise und gemalte Käsefäden) |
| `src/props.js` | Ölflasche, Latte, Mandeln, Holzlöffel, Spiegelei, Hähnchen, Lachs |
| `src/sticker.js` | Lego-Pixel-Sticker |
| `src/phone.js` | Phone mit Pumpy-Screen |
| `src/timeline.js` | Beats und Untertitel |
| `src/scene.js` | Ablauf: Schnitte, Messer, Kamera, Rätsel, Scan, Endcard |
| `audio.mjs` | Sound-Design |
| `render.mjs` | puppeteer → ffmpeg |
