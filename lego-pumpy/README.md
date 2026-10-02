# Pumpy LEGO-Animation

Animation im Stil der LEGO-Infografik-Reels: Eine graue 20×20-Platte (400 Noppen, also 1 % = 4 Noppen) füllt sich Stein für Stein. Thema: Wofür verbrennt dein Körper seine Kalorien am Tag?

| Anteil | Farbe | Bedeutung |
|---|---|---|
| 65 % | Beige | Grundumsatz (am Leben bleiben) |
| 20 % | Grün | Alltagsbewegung (Gehen, Zappeln, NEAT) |
| 10 % | Orange | Verdauung (thermischer Effekt) |
| 5 % | Rot | Training |

## Rendern

```bash
node render.mjs out.mp4   # 1080x1920, 30 fps, mit Klick-Sounds pro Stein
```

Braucht Playwright (Chromium) und ffmpeg. `scene.html` lässt sich auch direkt im Browser öffnen (über einen lokalen Server, damit die Schrift lädt); `window.render(t)` zeichnet das Bild zum Zeitpunkt `t`. Texte, Prozente und Timing stehen oben in `scene.html` (`REGIONS`, `TIMELINE`).
