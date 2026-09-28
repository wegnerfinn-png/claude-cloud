---
tags: [pumpy, marketing, video, claude-workflow]
created: 2026-09-28
---

# Pumpy Marketing-Videos – Learnings

Pumpy AI = Protein- & Kalorien-Tracker-App von Finn. Ziel: kurze 9:16-Videos (TikTok/Reels/Shorts), komplett animiert (kein echtes Filmmaterial), von Claude erzeugt.

## Was Finn will (Feedback)
- **Fertiges Video, kein Tool.** Nicht "baue mir einen Generator", sondern direkt die MP4 liefern.
- **Energie & Tempo.** Viel Bewegung, ständig passiert etwas. "Ein bisschen crazy, aber gut" = richtiges Level.
- **Verständliche, energische KI-Stimme.** Browser-TTS (Web Speech API) ist zu roboterhaft → "schlechteste KI-Stimme jemals".
- Erste ruhige Version (statischer Text, langsames Einblenden) = "unfassbar schlecht, zu langweilig".
- Bei neuen Formaten: freie Hand ("ich vertraue dir"), einfach umsetzen statt Rückfragen.

## Was funktioniert hat (Stil-Rezept)
- **Hook in Sekunde 0:** großes Wort knallt rein ("STOP"), Blitz + Screen-Shake + Impact-Sound.
- **Kinetische Untertitel:** Wort für Wort, max. 3 Wörter pro Gruppe, Großbuchstaben, dicke schwarze Kontur, Keywords gelb.
- **Jede Aussage bekommt eine eigene Mini-Animation** (Balken zersplittert Limit, Uhr rast, Waage pendelt, Zähler zählt hoch, Läufer läuft Strecke).
- **Zahlen zählen hoch** statt einfach dazustehen.
- **Stempel-Momente** ("BUSTED", "OUCH", "GOAL HIT") mit Slam-Animation + Sound.
- **Twist vor dem CTA** ("The real problem? You're guessing." / "But hey… Protein goal: smashed").
- **App-Moment:** Handy-Mockup, Essen fliegt rein, Ring füllt sich → "GOAL HIT" + Konfetti.
- **CTA pulsiert im Beat:** "PUMPY AI" + "DOWNLOAD NOW".
- Musik-Beat + SFX (Whoosh bei Szenenwechsel, Pops, Riser vor Drops, Ding bei Erfolg), Musik duckt unter der Stimme.
- Hintergrund nie statisch: Glow in Szenenfarbe (rot = Mythos, grün = Wahrheit), bewegtes Raster/Muster, Partikel, Beat-Pulse.
- Länge 35–42 s.

## Fertige Formate
1. **Myth Busting** – "3 Protein Myths killing your gains" (`pumpy-myths.mp4`)
2. **Wiesn-Kassenbon** – Kalorien eines Oktoberfest-Tags als druckender Kassenbon → Burn-off (55 km, mehr als ein Marathon) → Protein-Twist → "Prost!" (`pumpy-oktoberfest.mp4`), Oompah-Blasmusik synthetisiert
3. Älter: **Reveal-Tabellen** (Reveal Studio, `reveal/`) – Abdeckung rutscht Zeile für Zeile runter

Weitere Format-Ideen: Tier-List, "Rate mal welches mehr Protein hat", Green/Red Flag, Day-in-the-Life mit Uhr, Fake-Chat, Swipe-Stack, Streak-Kalender.

## Technische Pipeline (Claude-Cloud-Container)
Quellcode liegt in `claude-cloud/video-src/<format>/`.
1. **Stimme:** Kokoro TTS offline (`pip install kokoro-onnx soundfile`, Modell von GitHub-Releases `thewh1teagle/kokoro-onnx` `model-files-v1.0`). Stimme `af_bella`, `speed=1.12`. Nur Englisch gut → deutsche Wörter phonetisch schreiben ("Veezn", "Shvines-haxa", "Mahss"), Untertitel mit richtiger Schreibweise.
   - Edge-TTS (Microsoft) → 403 im Container. HuggingFace blockiert. GitHub geht.
2. **Audio-Mix:** `mix.py` (numpy) synthetisiert Beat/Musik + SFX, legt Voiceover-Segmente auf Zeitachse, schreibt `timeline.json`.
3. **Animation:** `anim.html` mit deterministischer `renderAt(t)`-Funktion (keine CSS-Transitions!) – alles aus Zeit berechnet, synchron zu `timeline.json`.
4. **Rendern:** Playwright/Chromium, 1080×1920, 30 fps, Screenshot pro Frame (~2 min).
5. **Encoden:** ffmpeg aus `pip install imageio-ffmpeg`, H.264 + AAC, `-movflags +faststart`.
- Fonts: Anton (Headlines) + Montserrat (Untertitel) von `raw.githubusercontent.com/google/fonts`.
- Vorher immer Vorschau-Frames als Kontaktbogen prüfen (Überlappungen, Umbrüche, Wortabstände bei skalierten Untertiteln).
- Achtung JS: keine globale `const top` (Konflikt mit `window.top`).
