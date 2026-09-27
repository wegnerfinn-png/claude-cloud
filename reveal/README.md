# Reveal Studio

Web-App für Reveal-Tabellen-Videos im 9:16-Format. Eine Abdeckung (Goldbarren, Geldschein, Karte, Akte) rutscht synchron zum Voiceover Zeile für Zeile nach unten. Die App läuft komplett im Browser, ohne Claude und ohne Backend.

## Auf dem Server starten

```bash
git clone -b claude/tender-sagan-l1t39n https://github.com/wegnerfinn-png/claude-cloud.git
cd claude-cloud/reveal
docker compose up -d
# Test: curl -I http://localhost:8095
```

## Subdomain über den Cloudflare-Tunnel anlegen

Zero Trust → Networks → Tunnels → `HomeServer` → Edit → Public Hostname → Add:

- Subdomain: `reveal`, Domain: `tablenine.de`
- Type: `HTTP`, URL: `localhost:8095` (läuft cloudflared selbst in Docker ohne Host-Netzwerk, trägst du stattdessen `192.168.178.175:8095` ein)

Danach ist die App unter https://reveal.tablenine.de erreichbar. Das Mikrofon funktioniert nur über HTTPS, also über die Subdomain und nicht über die LAN-IP.

## Aktualisieren

```bash
git pull
```

nginx liefert die Dateien direkt aus, ein Neustart ist nicht nötig.
