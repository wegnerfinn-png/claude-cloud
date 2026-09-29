# Belly Video – animiertes Short komplett aus Code

Ein 9:16-Video (1080×1920, 30 fps, ~55 s) im Stil der „6 Foods To Avoid For Belly Fat“-Clips. Alles ist Code, es gibt keine Stock-Clips, Bilder oder Samples:

- **Voiceover:** Piper (neuronale Offline-TTS), Stimme `en_US-joe-medium` (CC0)
- **Animation:** Canvas-2D im Browser. Jedes Lebensmittel ist eine Cartoon-Figur mit Gesicht, und jede Animation ist auf das gesprochene Wort getimt (Piper liefert Phonem-Timings).
- **Untertitel:** ein Wort nach dem anderen wie im Original. Schlagwörter sind gelb, die gesunde Alternative grün.
- **Musik und Soundeffekte:** mit numpy synthetisiert (Beat, Whoosh, Stempel, Blubbern, Crunch …). Die Musik wird unter der Stimme automatisch leiser.

Ergebnis: `out/belly-fat-foods.mp4`

## Aufbau

| Datei | Aufgabe |
| --- | --- |
| `script.json` | Sprechertext pro Szene, Titel, Highlight-Wörter, Stimme |
| `tts.py` | spricht den Text → `build/voice.wav` + `build/timeline.json` (Wort-Timings) |
| `web/engine.js` | Zeichen-Toolkit: Hintergrund, Untertitel, Übergänge, Pillen, Stempel, Charts, Gesichter |
| `web/foods.js` | die Cartoon-Figuren (Körper, Brot, Bier, Bubble Tea, Eis, Chips, Reis …) |
| `web/scenes.js` | Choreografie jeder Szene und Soundeffekt-Cues |
| `web/index.html` | Live-Vorschau mit Ton und Zeitleiste |
| `render.mjs` | rendert alle Frames in Headless-Chromium → `build/video.mp4` |
| `mix.py` | Musik + SFX + Stimme → `build/mix.wav` und fertiges MP4 |

## Selbst rendern

Voraussetzungen: Python 3.10+, Node 18+, ffmpeg

```bash
cd belly-video
pip install -r requirements.txt
npm install && npx playwright install chromium
./make.sh            # tts → render → mix, ca. 2 Minuten
```

Die Stimme lädt `tts.py` beim ersten Lauf automatisch über npm herunter.

Einzelne Frames zum Prüfen: `node render.mjs --stills 5,12.5,30`, die Bilder landen in `build/stills/`.

Vorschau im Browser: `npm run preview`, dann http://localhost:8080/web/index.html öffnen.

## Anpassen

- **Text ändern:** in `script.json`. Die Animationen hängen an einzelnen Wörtern, z. B. `S.wt('glycemic')` in `web/scenes.js`. Wenn du ein Wort entfernst, auf das eine Szene wartet, erscheint in der Konsole eine Warnung. Passe dann den Beat in `scenes.js` an.
- **Andere Stimme / Deutsch:** eine Piper-Stimme (`.onnx` + `.onnx.json`, z. B. `de_DE-thorsten-high`) nach `voices/` legen und in `script.json` bei `voice.model` eintragen, `espeak_voice` auf `de` setzen. Deutscher Text braucht außerdem deutsche Schlüsselwörter in `scenes.js`.
- **Tempo:** `voice.length_scale` (kleiner = schneller), `sentence_pause`, `scene_gap`
- **Lautstärken:** in `mix.py` die Faktoren für `mL`/`mR` (Musik) und `fx` in `main()`
